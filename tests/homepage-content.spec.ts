import { expect, test, type Page } from '@playwright/test'
import { normalizeHomepage, type HomepageContentDocument, type HomepageLanguageContent } from '../src/content/homepage'

function document(): HomepageContentDocument {
  const language = (lead: string): HomepageLanguageContent => ({
    hero: { lead, accent: 'Accent', description: 'Existing description' },
    tours: { eyebrow: 'Tours', lead: 'Tours heading', accent: 'Tours accent', description: 'Tours description' },
    services: { eyebrow: 'Services', lead: 'Services heading', accent: 'Services accent', description: 'Services description',
      items: (['turkish-night', 'sunset', 'daytime', 'bosphorus'] as const).map(categoryKey => ({ categoryKey, title: categoryKey, description: 'Service description', browseLabel: 'View', bookingLabel: 'Book' })) },
    why: { eyebrow: 'Why', lead: 'Why heading', accent: 'Why accent', reviews: 'Existing reviews', benefits: Array.from({ length: 4 }, () => ({ title: 'Benefit', description: 'Description' })) },
    stories: { eyebrow: 'Stories', lead: 'Stories heading', accent: 'Stories accent', description: 'Story description', quote: 'Existing quote', meta: 'Existing meta' },
    final: { pre: 'Final pre', title: 'Final title', action: 'Book' },
  })
  return { tr: language('Existing TR'), en: language('Existing EN'), instagramUrls: [] }
}
test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', route => route.abort())
  await page.route('**/fonts.gstatic.com/**', route => route.abort())
})
async function mock(page: Page, failSave = false) {
  let content = document()
  const saves: HomepageContentDocument[] = []
  const uploads: string[] = []
  await page.addInitScript(() => { sessionStorage.setItem('peremetours-session', JSON.stringify({ accessToken: 'fixture-token', expiresAtUtc: '2099-01-01T00:00:00Z', user: { id: 'fixture-admin', firstName: 'Fixture', lastName: 'Admin', email: 'admin@example.test', role: 'Admin' } })) })
  await page.route('**/api/v1/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname
    if (path === '/api/v1/admin/site-content/homepage/images') {
      uploads.push(path); expect(request.headers().authorization).toBe('Bearer fixture-token')
      return route.fulfill({ json: { url: '/assets/tour-dinner.webp' } })
    }
    if (path === '/api/v1/admin/site-content/homepage' && request.method() === 'PUT') {
      expect(request.headers().authorization).toBe('Bearer fixture-token')
      saves.push(request.postDataJSON()); if (failSave) return route.fulfill({ status: 503, json: { title: 'Fixture unavailable' } })
      content = request.postDataJSON(); return route.fulfill({ json: content })
    }
    if (path.endsWith('/site-content/homepage')) return route.fulfill({ json: content })
    if (path === '/api/v1/tours') return route.fulfill({ json: [{ externalTourId: 41, categoryKey: 'sunset', name: 'Live source', titleEn: 'Live source EN' }] })
    return route.fulfill({ status: 404, json: {} })
  })
  return { saves, uploads, publish: (next: HomepageContentDocument) => { content = next } }
}
test('admin preserves both language drafts and publishes all covers and new text fields', async ({ page }, testInfo) => {
  const api = await mock(page)
  await page.goto('/admin/site-content')
  const hero = page.locator('[data-content-section=hero]')
  await hero.getByLabel('Ana başlık', { exact: true }).fill('Yeni TR başlık')
  await hero.getByLabel('Üst etiket', { exact: true }).fill('Özel etiket')
  await page.locator('.site-content-language-tabs').getByRole('button', { name: /EN/ }).click()
  await hero.getByLabel('Ana başlık', { exact: true }).fill('New EN heading')
  await page.locator('.site-content-language-tabs').getByRole('button', { name: /TR/ }).click()
  await expect(hero.getByLabel('Ana başlık', { exact: true })).toHaveValue('Yeni TR başlık')
  const cover = page.locator('[data-image-slot=hero]')
  await cover.locator('input[type=file]').setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZfkAAAAASUVORK5CYII=', 'base64') })
  await expect(cover.getByRole('img')).toHaveAttribute('src', '/assets/tour-dinner.webp')
  await cover.getByLabel('Görsel odak noktası').selectOption('top')
  await page.getByLabel('Göster: Hikâyeler & Instagram', { exact: true }).uncheck()
  expect(api.saves).toHaveLength(0)
  await page.getByRole('button', { name: 'Tüm değişiklikleri kaydet' }).click()
  await expect(page.getByRole('status')).toContainText('kaydedildi')
  expect(api.saves).toHaveLength(1); expect(api.uploads).toHaveLength(1)
  expect(api.saves[0].tr.hero.lead).toBe('Yeni TR başlık'); expect(api.saves[0].en.hero.lead).toBe('New EN heading')
  expect(api.saves[0].tr.texts?.['hero.eyebrow']).toBe('Özel etiket')
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('Yeni TR başlık')
  await expect(page.locator('.hero__image')).toHaveCSS('background-position', '50% 0%')
  await expect(page.locator('.hero__image')).toHaveCSS('background-image', /tour-dinner.webp/)
  await expect(page.locator('.hero__copy')).toContainText('Özel etiket')
  await expect(page.locator('#hikayeler')).toHaveCount(0)
  await page.evaluate(() => localStorage.setItem('pereme-language', 'en')); await page.reload()
  await expect(page.locator('h1')).toContainText('New EN heading')
  await page.screenshot({ path: testInfo.outputPath('custom-homepage.png') })
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})
test('all configurable images render without changing real tour cards or route destinations', async ({ page }) => {
  const api = await mock(page)
  const next = normalizeHomepage(document())
  next.images = Object.fromEntries(['hero', 'final', 'storyMain', 'storySmall', 'turkish-night', 'sunset', 'daytime', 'bosphorus'].map(key => [key, '/assets/tour-dinner.webp']))
  next.tr.texts!['story.author'] = 'Updated author'; next.tr.texts!['footer.tagline'] = 'Updated tagline'
  api.publish(next); await page.goto('/')
  await expect(page.locator('.final-cta__image')).toHaveCSS('background-image', /tour-dinner.webp/)
  for (const image of await page.locator('.story-collage img, .service-card__image img').all()) await expect(image).toHaveAttribute('src', '/assets/tour-dinner.webp')
  await expect(page.locator('.testimonial__person')).toContainText('Updated author')
  await expect(page.locator('.footer__brand')).toContainText('Updated tagline')
  await expect(page.locator('.tour-card h3')).toContainText('Live source')
  await expect(page.locator('.tour-card img')).toHaveAttribute('src', '/assets/tour-sunset.webp')
  await expect(page.locator('.service-card').nth(1).getByRole('link')).toHaveAttribute('href', '/turlar/sunset')
  expect(api.saves).toHaveLength(0)
})
test('failed save keeps edits and invalid upload does not reach the server', async ({ page }) => {
  const api = await mock(page, true); await page.goto('/admin/site-content')
  const hero = page.locator('[data-content-section=hero]')
  await hero.getByLabel('Ana başlık', { exact: true }).fill('Unsaved heading')
  await page.locator('[data-image-slot=hero] input[type=file]').setInputFiles({ name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') })
  await expect(page.getByRole('alert')).toContainText('8 MB'); expect(api.uploads).toHaveLength(0)
  await page.getByRole('button', { name: 'Tüm değişiklikleri kaydet' }).click()
  await expect(page.getByRole('alert')).toContainText('Fixture unavailable')
  await expect(hero.getByLabel('Ana başlık', { exact: true })).toHaveValue('Unsaved heading')
  await expect(page.getByRole('button', { name: 'Tüm değişiklikleri kaydet' })).toBeEnabled()
})
