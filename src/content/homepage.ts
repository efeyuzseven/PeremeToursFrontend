export type HomepageCategory = 'bosphorus' | 'turkish-night' | 'sunset' | 'daytime'

export type HomepageSection = {
  eyebrow: string
  lead: string
  accent: string
  description: string
}

export type HomepageServiceItem = {
  categoryKey: HomepageCategory
  title: string
  description: string
  browseLabel: string
  bookingLabel: string
}

export type HomepageLanguageContent = {
  hero: { lead: string; accent: string; description: string }
  tours: HomepageSection
  services: HomepageSection & { items: HomepageServiceItem[] }
  why: {
    eyebrow: string
    lead: string
    accent: string
    reviews: string
    benefits: { title: string; description: string }[]
  }
  stories: HomepageSection & { quote: string; meta: string }
  final: { pre: string; title: string; action: string }
}

export type HomepageContentDocument = {
  tr: HomepageLanguageContent
  en: HomepageLanguageContent
  instagramUrls: string[]
}
