import { apiBaseUrl } from '../lib/api'

export type TourLanguage = 'tr' | 'en'
export type TourCategory = 'turkish-night' | 'sunset' | 'daytime' | 'bosphorus'
export type TourPageLanguageContent = { eyebrow: string; title: string; intro: string; bookingLabel: string; toursHeading: string; seoDescription: string }
export type TourPageSectionLanguageContent = { title: string; body: string | null; items: string[] }
export type TourPageSection = {
  id: string; type: 'text' | 'highlights' | 'gallery'; background: 'white' | 'blue'; isVisible: boolean
  imageUrls: string[]; tr: TourPageSectionLanguageContent; en: TourPageSectionLanguageContent
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
