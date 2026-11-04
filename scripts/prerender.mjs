// Build-time prerendering for crawlers that do not run JavaScript (SEO audit tools, social previews).
//
// Loads every public page of the built site (dist/) in headless Chromium and saves the rendered HTML, so each page's
// own title, H1, canonical, robots, Open Graph/Twitter tags and JSON-LD are in the HTML the server sends. In browsers
// the app still renders from scratch: index.html hides the prerendered markup and main.tsx clears it.
//
// Output: dist/prerendered/<key>.html and dist/prerendered/manifest.json. Each file is uploaded to the S3 key <key>
// (the page's path without the leading slash, no extension; the homepage is index.html) with content type text/html,
// so CloudFront serves it for that address with no extra rules. Pages that fail a check are left out and keep the
// plain SPA shell. See .github/workflows/deploy.yml.
//
// Usage: npm run build && npm run prerender
// Env: VITE_API_BASE_URL (same as the build), PRERENDER_BROWSER_CHANNEL (e.g. "msedge" or "chrome" to use an
// installed browser instead of Playwright's Chromium).
import { createReadStream } from 'node:fs'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { chromium } from '@playwright/test'

const SITE_URL = 'https://pereme.com.tr'
const apiBaseUrl = (process.env.VITE_API_BASE_URL ?? 'https://api-peremetours-test.d1-tech.com').replace(/\/$/, '')
const distDir = resolve('dist')
const outDir = join(distDir, 'prerendered')
const concurrency = 4

// Always rendered, also when the API cannot be reached. Category slugs are categorySlugs in src/content/tour-pages.ts.
const corePaths = ['/', '/blog', '/en/blog', '/iletisim', '/sikca-sorulan-sorular', '/kvkk-aydinlatma-metni', '/mesafeli-satis-sozlesmesi',
  '/turlar/turk-gecesi', '/turlar/sunset', '/turlar/daytime', '/turlar/bogaz-turu']
// Not for search engines (robots.txt disallows them) or aliases whose canonical is another address (src/lib/site.ts).
const skippedPaths = /^\/(admin|hesabim|account|login|sifremi-unuttum|sifre-sifirla|contact|faq|kvkk|distance-sales-agreement)(\/|$)/

const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2', '.pdf': 'application/pdf',
}

const warn = message => console.log(process.env.GITHUB_ACTIONS ? `::warning::${message}` : `WARN ${message}`)

// Site path for a page address, or null when it is not a page of this site that we prerender.
function sitePath(address) {
  let url
  try { url = new URL(address, SITE_URL) } catch { return null }
  if (!['pereme.com.tr', 'www.pereme.com.tr'].includes(url.hostname)) return null
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : '/'
  if (skippedPaths.test(path) || /\.[a-z0-9]+$/i.test(path)) return null
  return path
}

async function apiGet(path, as = 'json') {
  const response = await fetch(`${apiBaseUrl}${path}`, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
  return as === 'json' ? response.json() : response.text()
}

// Every public page: the API sitemap, plus blog posts and pages of both languages (the sitemap lists Turkish only).
// "complete" is false when a source failed, so the deploy does not delete earlier uploads it could not account for.
async function discoverPaths() {
  const paths = new Set(corePaths)
  const add = address => { const path = sitePath(address); if (path) paths.add(path) }
  let complete = true
  try {
    const xml = await apiGet('/sitemap.xml', 'text')
    for (const [, address] of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) add(address.replaceAll('&amp;', '&'))
    for (const [, address] of xml.matchAll(/<xhtml:link\b[^>]*\bhref="([^"]+)"/g)) add(address.replaceAll('&amp;', '&'))
  } catch (error) { complete = false; warn(`Sitemap unavailable: ${error.message}`) }
  for (const language of ['tr', 'en']) {
    const prefix = language === 'en' ? '/en' : ''
    try {
      for (let page = 1, seen = 0; page <= 50; page++) {
        const result = await apiGet(`/api/v1/blog?language=${language}&page=${page}&pageSize=50`)
        for (const item of result.items) add(`${prefix}/blog/${item.slug}`)
        seen += result.items.length
        if (!result.items.length || seen >= result.total) break
      }
    } catch (error) { complete = false; warn(`Blog list (${language}) unavailable: ${error.message}`) }
    try {
      for (const item of await apiGet(`/api/v1/pages?language=${language}`)) add(`${prefix}/${item.slug}`)
    } catch (error) { complete = false; warn(`Page list (${language}) unavailable: ${error.message}`) }
  }
  return { paths: [...paths].sort(), complete }
}

// Serves dist/ like CloudFront does: existing files as they are, anything else gets the SPA shell (index.html).
async function startServer() {
  const shell = await readFile(join(distDir, 'index.html'))
  const server = createServer(async (request, response) => {
    let file = null
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
      const candidate = resolve(distDir, `.${pathname}`)
      if (candidate.startsWith(distDir + sep) && (await stat(candidate)).isFile()) file = candidate
    } catch { /* not a file: shell */ }
    if (!file) { response.writeHead(200, { 'content-type': contentTypes['.html'] }); response.end(shell); return }
    response.writeHead(200, { 'content-type': contentTypes[extname(file).toLowerCase()] ?? 'application/octet-stream' })
    createReadStream(file).pipe(response)
  })
  await new Promise(done => server.listen(0, '127.0.0.1', done))
  return { server, origin: `http://127.0.0.1:${server.address().port}` }
}

// Removes what belongs to the browser session rather than the page, marks the markup as prerendered and reports
// the SEO checks. Runs inside the page.
function snapshotPage() {
  const root = document.getElementById('root')
  // Portals (dialogs, menus) and anything third parties appended to <body> are not part of the page.
  for (const node of [...document.body.childNodes]) if (node !== root) node.remove()
  // Third-party scripts and frames (reCAPTCHA, maps) would load a second time next to the app's own.
  for (const script of document.querySelectorAll('script')) {
    const keep = script.type === 'application/ld+json' || script.id === 'pereme-boot'
      || (script.type === 'module' && (script.getAttribute('src') ?? '').startsWith('/assets/'))
    if (!keep) script.remove()
  }
  document.querySelectorAll('iframe').forEach(frame => frame.remove())
  // Vite adds lazy chunks' preload links with absolute URLs of the local prerender server.
  for (const element of document.querySelectorAll('[href], [src]')) {
    for (const name of ['href', 'src']) {
      const value = element.getAttribute(name)
      if (value?.startsWith(location.origin)) element.setAttribute(name, value.slice(location.origin.length) || '/')
    }
  }
  document.querySelectorAll('.leaflet-container').forEach(map => map.replaceChildren())
  const html = document.documentElement
  html.classList.remove('pereme-js')
  if (!html.classList.length) html.removeAttribute('class')
  for (const { name } of [...html.attributes]) if (name.startsWith('data-pereme-a11y')) html.removeAttribute(name)
  document.body.removeAttribute('style')
  root.setAttribute('data-prerendered', '')

  const content = selector => document.querySelector(selector)?.getAttribute('content')?.trim() ?? ''
  const required = ['og:title', 'og:description', 'og:url', 'og:image', 'og:type'].map(key => `meta[property="${key}"]`)
    .concat(['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'].map(key => `meta[name="${key}"]`))
  return {
    html: `<!doctype html>\n${html.outerHTML}\n`,
    title: document.title,
    h1: document.querySelectorAll('h1').length,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
    robots: content('meta[name="robots"]'),
    missingSocial: required.filter(selector => !content(selector)),
    jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map(script => {
      try {
        const data = JSON.parse(script.textContent)
        return [data['@graph'] ?? data].flat().map(item => item['@type']).join('+')
      } catch { return 'INVALID' }
    }),
  }
}

async function renderPage(browser, origin, path) {
  // A fresh context per page: the language choice is kept in localStorage and must not leak between pages.
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul', serviceWorkers: 'block' })
  const apiOrigin = new URL(apiBaseUrl).origin
  await context.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    // Images, fonts and media change nothing in the HTML; other sites (fonts, maps, reCAPTCHA) are not needed.
    if (['image', 'media', 'font'].includes(request.resourceType())) return route.abort()
    if (url.origin === origin) return route.continue()
    if (url.origin === apiOrigin && ['GET', 'HEAD'].includes(request.method())) {
      // Fetched outside the page, so the API's CORS allowlist (which has no localhost) does not apply.
      const response = await route.fetch()
      // The body arrives decoded, so the original encoding/length headers no longer apply.
      const headers = Object.fromEntries(Object.entries(response.headers()).filter(([name]) => !['content-encoding', 'content-length'].includes(name)))
      return route.fulfill({ status: response.status(), body: await response.body(), headers: { ...headers, 'access-control-allow-origin': origin } })
    }
    return route.abort()
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto(`${origin}${path}`, { waitUntil: 'networkidle', timeout: 60_000 })
    // Ready: the page has its heading and metadata, and nothing is still loading.
    await page.waitForFunction(() => {
      const root = document.getElementById('root')
      return !!root?.querySelector('h1') && !root.querySelector('[role="status"], .faq-skeleton, .site-content-loading')
        && !!document.querySelector('link[rel="canonical"]')
    }, null, { timeout: 30_000 })
    await page.waitForTimeout(500) // effects that run after the last response (metadata, JSON-LD)
    const snapshot = await page.evaluate(snapshotPage)
    const expectedCanonical = `${SITE_URL}${path}`
    const problems = [
      snapshot.h1 !== 1 && `${snapshot.h1} h1 elements`,
      snapshot.canonical !== expectedCanonical && `canonical ${snapshot.canonical}`,
      snapshot.robots !== 'index, follow' && `robots "${snapshot.robots}"`,
      snapshot.missingSocial.length && `missing ${snapshot.missingSocial.join(', ')}`,
      snapshot.jsonLd.includes('INVALID') && 'invalid JSON-LD',
      snapshot.html.includes(origin) && 'local server address left in the HTML',
      errors.length && `script errors: ${errors.join(' | ')}`,
    ].filter(Boolean)
    return { ...snapshot, problems }
  } catch (error) {
    return { problems: [error.message.split('\n')[0]] }
  } finally {
    await context.close()
  }
}

const keyFor = path => path === '/' ? 'index.html' : path.slice(1).split('/').map(decodeURIComponent).join('/')
const fileFor = key => key === 'index.html' ? key : `${key}.html`

const { paths, complete } = await discoverPaths()
await rm(outDir, { recursive: true, force: true })
const { server, origin } = await startServer()
const browser = await chromium.launch({ channel: process.env.PRERENDER_BROWSER_CHANNEL || undefined })
const pages = []
const failed = []
try {
  const queue = [...paths]
  await Promise.all(Array.from({ length: concurrency }, async () => {
    for (let path = queue.shift(); path; path = queue.shift()) {
      const key = keyFor(path)
      const result = await renderPage(browser, origin, path)
      if (result.problems.length) {
        failed.push({ path, key, reason: result.problems.join('; ') })
        warn(`Not prerendered ${path}: ${result.problems.join('; ')}`)
        continue
      }
      const file = fileFor(key)
      await mkdir(dirname(join(outDir, file)), { recursive: true })
      await writeFile(join(outDir, file), result.html)
      pages.push({ path, key, file, title: result.title, jsonLd: result.jsonLd })
      console.log(`OK ${path} -> ${key} | ${result.title} | JSON-LD: ${result.jsonLd.join(', ') || '-'}`)
    }
  }))
} finally {
  await browser.close()
  server.close()
}

pages.sort((a, b) => a.path.localeCompare(b.path))
failed.sort((a, b) => a.path.localeCompare(b.path))
await mkdir(outDir, { recursive: true })
await writeFile(join(outDir, 'manifest.json'), `${JSON.stringify({ generatedAtUtc: new Date().toISOString(), complete, pages, failed }, null, 2)}\n`)
console.log(`Prerendered ${pages.length} of ${paths.length} pages${complete ? '' : ' (page discovery incomplete)'}.`)
