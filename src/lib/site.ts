export const SITE_NAME = 'Dentur | Pereme Tours'
export const SITE_URL = 'https://www.pereme.com.tr'

type PageMetadata = {
  title?: string
  description?: string
  language?: 'tr' | 'en'
  indexable?: boolean
}

const canonicalPaths: Record<string, string> = {
  '/contact': '/iletisim',
  '/faq': '/sikca-sorulan-sorular',
  '/kvkk': '/kvkk-aydinlatma-metni',
  '/account': '/hesabim',
}

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute(attribute, key)
    document.head.append(meta)
  }
  meta.content = content
}

export function setPageMetadata({ title, description, language, indexable = true }: PageMetadata = {}) {
  const english = (language ?? document.documentElement.lang) === 'en'
  const pageTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME
  const pageDescription = description ?? (english
    ? 'Discover Bosphorus Cruise, Turkish Night Dinner Cruise, Sunset and Daytime experiences with Dentur | Pereme Tours.'
    : 'Dentur | Pereme Tours ile Boğaz Turu, Türk Gecesi Dinner Cruise, Sunset ve Daytime deneyimlerini keşfedin.')
  const path = canonicalPaths[window.location.pathname] ?? window.location.pathname
  const url = `${SITE_URL}${path}`
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.append(canonical)
  }
  canonical.href = url
  document.title = pageTitle
  setMeta('name', 'description', pageDescription)
  setMeta('name', 'robots', indexable ? 'index, follow' : 'noindex, nofollow')
  setMeta('property', 'og:site_name', SITE_NAME)
  setMeta('property', 'og:title', pageTitle)
  setMeta('property', 'og:description', pageDescription)
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:locale', english ? 'en_US' : 'tr_TR')
  setMeta('name', 'twitter:title', pageTitle)
  setMeta('name', 'twitter:description', pageDescription)
}
