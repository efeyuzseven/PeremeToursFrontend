import { apiBaseUrl } from '../lib/api'

export type TourLanguage = 'tr' | 'en'
export type TourCategory = 'turkish-night' | 'sunset' | 'daytime' | 'bosphorus'
export type TourPageBookingNote = { title: string; text: string | null }
export type TourPageLanguageContent = {
  eyebrow: string; title: string; intro: string; bookingLabel: string; toursHeading: string; seoDescription: string
  // null = never edited, so the default notes are shown; [] hides the notes.
  bookingNotes?: TourPageBookingNote[] | null
  // Tour detail pages are written as one plain text; see parseTourDetails.
  details?: string | null
}
export type TourPageSectionLanguageContent = { title: string; body: string | null; items: string[]; excludedItems?: string[] | null }
export type TourPageSection = {
  id: string; type: 'text' | 'highlights' | 'included' | 'gallery' | 'map'; background: 'white' | 'blue'; isVisible: boolean
  imageUrls: string[]; tr: TourPageSectionLanguageContent; en: TourPageSectionLanguageContent
  mapUrl?: string | null
}

// A page has up to three maps, shown in this order; the section id says which one it is (the backend allows only these).
export const mapSlots = [
  { id: 'meeting-point', tr: 'Buluşma noktası', en: 'Meeting point' },
  { id: 'route', tr: 'Güzergah', en: 'Route' },
  { id: 'service-point', tr: 'Servis noktası', en: 'Shuttle point' },
] as const

// Only Google Maps embed URLs may be framed; the backend enforces the same rule.
export function isGoogleMapEmbed(value: string | null | undefined): value is string {
  if (!value || value.length > 2000 || /["\\\s]/.test(value)) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'www.google.com' && !url.port && !url.username && url.pathname.startsWith('/maps/embed')
  } catch { return false }
}
// Accepts Google Maps' "Embed a map" HTML (the iframe) or its src URL.
export function extractMapEmbedUrl(input: string) {
  const value = input.trim()
  const src = /<iframe[^>]*\ssrc=["']([^"']+)["']/i.exec(value)?.[1] ?? value
  const url = src.replaceAll('&amp;', '&')
  return isGoogleMapEmbed(url) ? url : null
}
export type TourPageDocument = {
  heroLayout: 'cover' | 'split'; heroImageUrl: string | null
  tr: TourPageLanguageContent; en: TourPageLanguageContent; sections: TourPageSection[]
}
export type TourPageItem = {
  key: string; categoryKey: TourCategory; externalTourId: number | null; sourceName: string
  document: TourPageDocument; isCustomized: boolean; updatedAtUtc: string | null
}
export type PublicTourItem = {
  externalTourId: number; categoryKey: TourCategory; name: string; titleTr?: string | null; titleEn?: string | null
  descriptionTr?: string | null; descriptionEn?: string | null; imageUrl?: string | null; sortOrder: number
}
export const tourCategories: TourCategory[] = ['turkish-night', 'sunset', 'daytime', 'bosphorus']
export const categorySlugs: Record<TourCategory, string> = { 'turkish-night': 'turk-gecesi', sunset: 'sunset', daytime: 'daytime', bosphorus: 'bogaz-turu' }
export const categoryLabels: Record<TourCategory, Record<TourLanguage, string>> = {
  'turkish-night': { tr: 'Türk Gecesi', en: 'Turkish Night' }, sunset: { tr: 'Sunset', en: 'Sunset' },
  daytime: { tr: 'DayTime', en: 'Daytime' }, bosphorus: { tr: 'Boğaz Turu', en: 'Bosphorus Cruise' },
}
export const categoryImages: Record<TourCategory, string> = {
  'turkish-night': '/assets/tour-dinner.webp', sunset: '/assets/tour-sunset.webp',
  daytime: '/assets/hero-bosphorus.webp', bosphorus: '/assets/hero-bosphorus.webp',
}
export const defaultBookingNotes: Record<TourLanguage, TourPageBookingNote[]> = {
  tr: [{ title: 'Ücretsiz iptal', text: 'Turdan 24 saat öncesine kadar ücretsiz iptal kolaylığı.' },
    { title: 'Anında onay', text: 'Ödemenin ardından biletin e-posta adresine gönderilir.' }],
  en: [{ title: 'Free cancellation', text: 'Cancel free of charge up to 24 hours before the tour.' },
    { title: 'Instant confirmation', text: 'Your ticket is emailed to you right after payment.' }],
}
export const bookingNotesFor = (content: TourPageLanguageContent, language: TourLanguage) => content.bookingNotes ?? defaultBookingNotes[language]

export type TourDetailBlock =
  | { kind: 'text'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'checks'; items: { included: boolean; text: string }[] }
export type TourDetailRow = { title: string; blocks: TourDetailBlock[] }

// "## Heading" starts a row; "- item" is a bullet; "+ item" is included (✓); "x item" is not included (✕).
// Any other line is text, and a blank line starts a new paragraph. The result is rendered as text, never as HTML.
export function parseTourDetails(source: string): TourDetailRow[] {
  const rows: TourDetailRow[] = []
  let row: TourDetailRow | null = null
  let paragraphBreak = false
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim()
    const heading = /^#+\s*(.*)$/.exec(line)
    if (heading) { row = { title: heading[1], blocks: [] }; rows.push(row); paragraphBreak = false; continue }
    if (!line) { paragraphBreak = true; continue }
    if (!row) { row = { title: '', blocks: [] }; rows.push(row) }
    const last = row.blocks[row.blocks.length - 1]
    const bullet = /^(?:[-*]\s+|•\s*)(.+)$/.exec(line)
    const check = /^(?:[+✓✔]\s*|[xX✕✗×]\s+)(.+)$/.exec(line)
    if (bullet) {
      if (last?.kind === 'bullets') last.items.push(bullet[1]); else row.blocks.push({ kind: 'bullets', items: [bullet[1]] })
    } else if (check) {
      const item = { included: /^[+✓✔]/.test(line), text: check[1] }
      if (last?.kind === 'checks') last.items.push(item); else row.blocks.push({ kind: 'checks', items: [item] })
    } else if (last?.kind === 'text' && !paragraphBreak) last.text += `\n${line}`
    else row.blocks.push({ kind: 'text', text: line })
    paragraphBreak = false
  }
  return rows.filter(item => item.title || item.blocks.length)
}

// Pages saved before the free-text editor keep their content: their sections are converted to the same text format.
export function sectionsToDetails(sections: TourPageSection[], language: TourLanguage) {
  return sections.filter(section => section.type !== 'gallery' && section.type !== 'map' && section.isVisible).map(section => {
    const content = section[language]
    const items = content.items.filter(item => item.trim()).map(item => `${section.type === 'included' ? '+' : '-'} ${item.trim()}`)
    const excluded = (content.excludedItems ?? []).filter(item => item.trim()).map(item => `x ${item.trim()}`)
    return [`## ${content.title}`, content.body?.trim(), [...items, ...excluded].join('\n')].filter(Boolean).join('\n')
  }).join('\n\n')
}
export const tourDetailsFor = (document: TourPageDocument, language: TourLanguage) =>
  document[language].details ?? sectionsToDetails(document.sections, language)
// Content that starts with a tag is admin-written HTML (sanitized when rendered); anything else uses the line markers above.
export const isHtmlDetails = (details: string) => /^\s*</.test(details)
// The editor works on text only: old text/list sections move into the details text; galleries and maps stay as sections.
export const withTextDetails = (document: TourPageDocument): TourPageDocument => ({
  ...document,
  tr: { ...document.tr, details: tourDetailsFor(document, 'tr') },
  en: { ...document.en, details: tourDetailsFor(document, 'en') },
  sections: document.sections.filter(section => section.type === 'gallery' || section.type === 'map'),
})
export const tourDetailsTemplate: Record<TourLanguage, string> = {
  tr: '## İlgi çekici noktalar\n- Birinci madde\n- İkinci madde\n\n## Tam açıklama\nTurun açıklamasını buraya yazın.\n\n## Dahil olanlar\n+ Dahil olan bir şey\nx Dahil olmayan bir şey\n\n## Kimler için uygun değil\n- Tekerlekli sandalye kullananlar',
  en: '## Highlights\n- First item\n- Second item\n\n## Full description\nWrite the tour description here.\n\n## Includes\n+ Something included\nx Something not included\n\n## Not suitable for\n- Wheelchair users',
}
export const categoryPath = (category: TourCategory) => `/turlar/${categorySlugs[category]}`
export const tourPath = (id: number) => `/tur/${id}`
export const pagePath = (page: Pick<TourPageItem, 'externalTourId' | 'categoryKey'>) => page.externalTourId ? tourPath(page.externalTourId) : categoryPath(page.categoryKey)
export const resolvePageImage = (url: string) => url.startsWith('/api/') ? `${apiBaseUrl}${url}` : url
export const tourTitle = (tour: PublicTourItem, language: TourLanguage) => (language === 'tr' ? tour.titleTr : tour.titleEn) || tour.name
export const bookingTour = (tour: PublicTourItem) => ({
  id: tour.externalTourId, title: { tr: tourTitle(tour, 'tr'), en: tourTitle(tour, 'en') },
  image: resolvePageImage(tour.imageUrl || categoryImages[tour.categoryKey]),
  duration: { tr: 'Güncel sefer bilgileri', en: 'Current departure details' },
})
