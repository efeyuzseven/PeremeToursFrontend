export const SITE_NAME = 'Dentur | Pereme Tours'
export const SITE_URL = 'https://pereme.com.tr'
export const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/denturpereme/'
export const INSTAGRAM_HANDLE = '@denturpereme'

export function siteScrollBehavior(): ScrollBehavior {
  return document.documentElement.hasAttribute('data-pereme-a11y-pausemotion')
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

type PageMetadata = {
  title?: string
  description?: string
  language?: 'tr' | 'en'
  indexable?: boolean
  // Absolute or site-relative share image; defaults to the site cover image.
  image?: string | null
  type?: 'website' | 'article'
  // Paths of the same content in each language, published as hreflang alternates.
  alternates?: Partial<Record<'tr' | 'en', string>>
  // Structured data for search engines (schema.org JSON-LD).
  jsonLd?: object | object[]
}

const DEFAULT_IMAGE = `${SITE_URL}/assets/ad2ca4f6-d888-4621-b0c1-b3db5903f0ac.webp`

const canonicalPaths: Record<string, string> = {
  '/contact': '/iletisim',
  '/faq': '/sikca-sorulan-sorular',
  '/kvkk': '/kvkk-aydinlatma-metni',
  '/distance-sales-agreement': '/mesafeli-satis-sozlesmesi',
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

export function setPageMetadata({ title, description, language, indexable = true, image, type = 'website', alternates, jsonLd }: PageMetadata = {}) {
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
  const shareImage = image ? (image.startsWith('http') ? image : `${SITE_URL}${image}`) : DEFAULT_IMAGE
  setMeta('property', 'og:image', shareImage)
  setMeta('name', 'twitter:image', shareImage)
  setMeta('property', 'og:type', type)
  // Alternates and structured data belong to one page only: replace whatever the previous page set.
  document.querySelectorAll('link[data-pereme-alternate]').forEach(link => link.remove())
  if (alternates) {
    const links = Object.entries(alternates).filter(([, path]) => path)
    if (alternates.tr) links.push(['x-default', alternates.tr])
    for (const [hreflang, path] of links) {
      const link = document.createElement('link')
      link.rel = 'alternate'; link.hreflang = hreflang; link.href = `${SITE_URL}${path}`
      link.setAttribute('data-pereme-alternate', '')
      document.head.append(link)
    }
  }
  document.getElementById('pereme-jsonld')?.remove()
  if (jsonLd) {
    const script = document.createElement('script')
    script.type = 'application/ld+json'; script.id = 'pereme-jsonld'
    // Escape "<" so admin-written text can never close the script element.
    script.textContent = JSON.stringify(jsonLd).replace(/</g, '\\u003c')
    document.head.append(script)
  }
}
