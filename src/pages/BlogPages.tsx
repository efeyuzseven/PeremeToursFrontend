import { ArrowLeft, ArrowRight, CalendarDays, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError, apiRequest } from '../lib/api'
import { blogPath, contentImage, formatContentDate, pagePath, type ContentKind, type ContentLanguage, type PublicContentPage,
  type PublicContentPageList, type PublicContentPageListItem } from '../lib/content-pages'
import { htmlToText, sanitizeHtml } from '../lib/html'
import { setPageMetadata, SITE_NAME, SITE_URL } from '../lib/site'
import PublicPageLayout from './PublicPageLayout'
import './content-pages.css'

const copy = {
  tr: { home: 'Ana sayfa', eyebrow: 'Pereme Blog', title: 'Boğaz’dan notlar', description: 'İstanbul Boğazı, turlarımız ve şehrin denizden görünen hikâyeleri üzerine yazılar.',
    read: 'Yazıyı oku', more: 'Daha fazla yazı', empty: 'Henüz yayınlanmış bir yazı yok.', loading: 'Yükleniyor…', error: 'İçerik şu anda yüklenemiyor.', retry: 'Tekrar dene',
    missing: 'Aradığınız içerik bulunamadı', missingText: 'Bu yazı veya sayfa kaldırılmış ya da adresi değişmiş olabilir.', back: 'Tüm yazılar', toHome: 'Ana sayfaya dön' },
  en: { home: 'Home', eyebrow: 'Pereme Blog', title: 'Notes from the Bosphorus', description: 'Stories about the Bosphorus, our cruises and Istanbul as seen from the water.',
    read: 'Read article', more: 'More articles', empty: 'No articles have been published yet.', loading: 'Loading…', error: 'This content cannot be loaded right now.', retry: 'Try again',
    missing: 'Content not found', missingText: 'This article or page may have been removed or moved to a new address.', back: 'All articles', toHome: 'Back to homepage' },
}

const languageOf = (pathname: string): ContentLanguage => pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'tr'
const organization = { '@type': 'Organization', name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/assets/pereme-logo.svg` }

function BlogList({ language }: { language: ContentLanguage }) {
  const c = copy[language]
  const [items, setItems] = useState<PublicContentPageListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    apiRequest<PublicContentPageList>(`/api/v1/blog?language=${language}&page=${page}&pageSize=12`, { signal: controller.signal, cache: 'no-store' })
      .then(result => { if (!controller.signal.aborted) { setItems(current => page === 1 ? result.items : [...current, ...result.items]); setTotal(result.total); setError(false) } })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [language, page, reload])
  useEffect(() => {
    setPageMetadata({ title: c.title, description: c.description, language, alternates: { tr: blogPath('tr'), en: blogPath('en') },
      jsonLd: { '@context': 'https://schema.org', '@type': 'Blog', name: `${c.eyebrow} — ${c.title}`, description: c.description, url: `${SITE_URL}${blogPath(language)}`,
        inLanguage: language, publisher: organization, blogPost: items.map(item => ({ '@type': 'BlogPosting', headline: item.title,
          url: `${SITE_URL}${blogPath(language, item.slug)}`, datePublished: item.publishedAtUtc ?? undefined })) } })
  }, [c, language, items])
  return <>
    <section className="content-hero"><div className="shell"><span className="content-eyebrow">{c.eyebrow}</span><h1>{c.title}</h1><p>{c.description}</p></div></section>
    <section className="shell blog-list">
      {loading && items.length === 0 ? <p className="content-state" role="status">{c.loading}</p>
        : error && items.length === 0 ? <div className="content-state"><p>{c.error}</p><button type="button" onClick={() => { setLoading(true); setReload(value => value + 1) }}><RefreshCw size={16} />{c.retry}</button></div>
        : items.length === 0 ? <p className="content-state">{c.empty}</p>
        : <div className="blog-grid">{items.map(item => <article className="blog-card" key={item.slug}>
          <Link to={blogPath(language, item.slug)} className="blog-card__image" tabIndex={-1} aria-hidden="true">
            {contentImage(item.coverImageUrl) ? <img src={contentImage(item.coverImageUrl)!} alt="" loading="lazy" /> : <span />}
          </Link>
          <div className="blog-card__body">
            {item.publishedAtUtc && <time dateTime={item.publishedAtUtc}><CalendarDays size={14} />{formatContentDate(item.publishedAtUtc, language)}</time>}
            <h2><Link to={blogPath(language, item.slug)}>{item.title}</Link></h2>
            {item.summary && <p>{item.summary}</p>}
            <Link className="blog-card__link" to={blogPath(language, item.slug)}>{c.read}<ArrowRight size={16} /></Link>
          </div>
        </article>)}</div>}
      {items.length > 0 && items.length < total && <button className="content-more" type="button" disabled={loading} onClick={() => { setLoading(true); setPage(value => value + 1) }}>{loading ? c.loading : c.more}</button>}
    </section>
  </>
}

// One blog post or standalone page; reports the loaded item so the layout can switch to its other-language address.
function ContentView({ kind, language, slug, onLoad }: { kind: ContentKind; language: ContentLanguage; slug: string; onLoad: (item: PublicContentPage | null) => void }) {
  const c = copy[language]
  const [item, setItem] = useState<PublicContentPage | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    window.scrollTo(0, 0)
    apiRequest<PublicContentPage>(`/api/v1/${kind === 'blog' ? 'blog' : 'pages'}/${encodeURIComponent(slug)}?language=${language}`, { signal: controller.signal, cache: 'no-store' })
      .then(result => { if (!controller.signal.aborted) { setItem(result); setState('ready'); onLoad(result) } })
      .catch(caught => { if (!controller.signal.aborted) { setItem(null); setState(caught instanceof ApiError && caught.status === 404 ? 'missing' : 'error'); onLoad(null) } })
    return () => controller.abort()
  }, [kind, language, slug, reload, onLoad])
  const body = useMemo(() => item ? sanitizeHtml(item.body) : '', [item])
  useEffect(() => {
    if (state === 'missing' || state === 'error') { setPageMetadata({ title: c.missing, language, indexable: false }); return }
    if (!item) return
    const path = kind === 'blog' ? blogPath : pagePath
    const url = `${SITE_URL}${path(language, item.slug)}`
    const description = item.metaDescription || item.summary || htmlToText(item.body).slice(0, 160)
    const image = contentImage(item.coverImageUrl)
    const breadcrumb = { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: c.home, item: `${SITE_URL}${language === 'en' ? '/en/blog' : '/'}` },
      ...(kind === 'blog' ? [{ '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}${blogPath(language)}` }] : []),
      { '@type': 'ListItem', position: kind === 'blog' ? 3 : 2, name: item.title, item: url }] }
    setPageMetadata({ title: item.metaTitle || item.title, description, language, image, type: kind === 'blog' ? 'article' : 'website',
      alternates: { tr: path('tr', item.slugTr), ...(item.slugEn ? { en: path('en', item.slugEn) } : {}) },
      jsonLd: { '@context': 'https://schema.org', '@graph': [kind === 'blog'
        ? { '@type': 'BlogPosting', headline: item.title, description, image: image ?? undefined, datePublished: item.publishedAtUtc ?? undefined,
          dateModified: item.updatedAtUtc, inLanguage: language, mainEntityOfPage: url, author: organization, publisher: organization }
        : { '@type': 'WebPage', name: item.title, description, url, inLanguage: language }, breadcrumb] } })
  }, [item, state, kind, language, c])
  if (state === 'loading') return <p className="content-state content-state--page" role="status">{c.loading}</p>
  if (state !== 'ready' || !item) return <section className="shell content-state content-state--page">
    <h1>{state === 'missing' ? c.missing : c.error}</h1><p>{state === 'missing' ? c.missingText : ''}</p>
    {state === 'error' && <button type="button" onClick={() => { setState('loading'); setReload(value => value + 1) }}><RefreshCw size={16} />{c.retry}</button>}
    <Link to={kind === 'blog' ? blogPath(language) : '/'}><ArrowLeft size={16} />{kind === 'blog' ? c.back : c.toHome}</Link>
  </section>
  return <article className="content-article">
    <header className="shell content-article__header">
      <nav className="content-breadcrumb" aria-label={language === 'tr' ? 'Sayfa yolu' : 'Breadcrumb'}><Link to="/">{c.home}</Link><span>/</span>
        {kind === 'blog' && <><Link to={blogPath(language)}>Blog</Link><span>/</span></>}<span aria-current="page">{item.title}</span></nav>
      <h1>{item.title}</h1>
      {kind === 'blog' && item.publishedAtUtc && <time dateTime={item.publishedAtUtc}><CalendarDays size={15} />{formatContentDate(item.publishedAtUtc, language)}</time>}
      {item.summary && <p className="content-article__summary">{item.summary}</p>}
    </header>
    {contentImage(item.coverImageUrl) && <div className="shell content-article__cover"><img src={contentImage(item.coverImageUrl)!} alt="" /></div>}
    <div className="shell"><div className="content-body" dangerouslySetInnerHTML={{ __html: body }} /></div>
    {kind === 'blog' && <div className="shell content-article__footer"><Link to={blogPath(language)}><ArrowLeft size={16} />{c.back}</Link></div>}
  </article>
}

export function BlogListPage() {
  const navigate = useNavigate()
  const language = languageOf(useLocation().pathname)
  return <PublicPageLayout language={language} onLanguageChange={next => navigate(blogPath(next))}>{() => <BlogList key={language} language={language} />}</PublicPageLayout>
}

function ContentRoute({ kind }: { kind: ContentKind }) {
  const navigate = useNavigate()
  const language = languageOf(useLocation().pathname)
  const slug = useParams().slug ?? ''
  const [loaded, setLoaded] = useState<PublicContentPage | null>(null)
  // The other-language address of this item; without a translation, that language's blog or homepage.
  const switchLanguage = (next: ContentLanguage) => {
    if (next === language) return
    const target = next === 'en' ? loaded?.slugEn : loaded?.slugTr
    navigate(target ? (kind === 'blog' ? blogPath(next, target) : pagePath(next, target)) : (kind === 'blog' ? blogPath(next) : '/'))
  }
  return <PublicPageLayout language={language} onLanguageChange={switchLanguage}>
    {() => <ContentView key={`${language}-${slug}`} kind={kind} language={language} slug={slug} onLoad={setLoaded} />}
  </PublicPageLayout>
}

export const BlogPostPage = () => <ContentRoute kind="blog" />
export const StandalonePage = () => <ContentRoute kind="page" />
