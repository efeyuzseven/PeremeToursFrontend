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
  texts?: Record<string, string>
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
  images?: Record<string, string>
  imagePositions?: Record<string, string>
  hiddenSections?: string[]
  announcements?: HomepageAnnouncement[]
  // Up to 6 photos shown side by side in the stories section.
  storyPhotos?: string[]
}

export type HomepageAnnouncementText = { title: string; body: string | null; linkLabel: string | null }
// Shown on the homepage in list order; date is yyyy-MM-dd, linkUrl is https://... or a path on this site.
export type HomepageAnnouncement = {
  id: string; isVisible: boolean; date: string | null; imageUrl: string | null; linkUrl: string | null
  tr: HomepageAnnouncementText; en: HomepageAnnouncementText
}

// Only presentation is editable here; routes, provider IDs and live prices are independent.
export const homepageTextFields = [
  ['navigation', 'account', 'Hesabım butonu', 'Account button', 'Hesabım', 'My account'],
  ['hero', 'hero.eyebrow', 'Üst etiket', 'Eyebrow', 'İstanbul, suyun öteki tarafından', 'Istanbul, from the other side of the water'],
  ['hero', 'hero.toursLink', 'Turlar bağlantısı', 'Tours link', 'Turları incele', 'Explore tours'],
  ['hero', 'hero.scroll', 'Aşağı kaydır metni', 'Scroll label', 'Keşfet', 'Explore'],
  ['hero', 'hero.cardLabel', 'Rota kartı üst yazısı', 'Route card label', 'İstanbul Boğazı’nda', 'On the Bosphorus'],
  ['hero', 'hero.cardCount', 'Rota kartı sayısı metni', 'Route card count text', '4 deneyim', '4 experiences'],
  ['hero', 'hero.cardLead', 'Rota kartı başlığı', 'Route card heading', 'Her saate', 'A different Istanbul'],
  ['hero', 'hero.cardAccent', 'Rota kartı vurgusu', 'Route card accent', 'başka bir İstanbul.', 'for every moment.'],
  ['hero', 'hero.cardNote', 'Rota kartı alt yazısı', 'Route card note', 'Rotanı seç, İstanbul’u denizden keşfet.', 'Choose your route and discover Istanbul from the water.'],
  ['hero', 'hero.cardTypes.0', 'Rota kartı: Türk Gecesi', 'Route card: Turkish Night', 'Türk Gecesi', 'Turkish Night'],
  ['hero', 'hero.cardTypes.1', 'Rota kartı: Sunset', 'Route card: Sunset', 'Sunset', 'Sunset'],
  ['hero', 'hero.cardTypes.2', 'Rota kartı: DayTime', 'Route card: DayTime', 'DayTime', 'DayTime'],
  ['hero', 'hero.cardTypes.3', 'Rota kartı: Boğaz', 'Route card: Bosphorus', 'Boğaz Turu', 'Bosphorus'],
  ['booking', 'booking.experience', 'Tur seçimi etiketi', 'Tour picker label', 'Deneyim', 'Experience'],
  ['booking', 'booking.date', 'Tarih etiketi', 'Date label', 'Tarih', 'Date'],
  ['booking', 'booking.guest', 'Misafir etiketi', 'Guest label', 'Misafir', 'Guests'],
  ['booking', 'booking.search', 'Tur arama butonu', 'Search button', 'Uygun turları bul', 'Find available tours'],
  ['booking', 'categories.all', 'Tüm turlar filtresi', 'All tours filter', 'Tümü', 'All'],
  ['booking', 'categories.turkishNight', 'Türk Gecesi etiketi', 'Turkish Night label', 'Türk Gecesi', 'Turkish Night'],
  ['booking', 'categories.sunset', 'Sunset etiketi', 'Sunset label', 'Sunset', 'Sunset'],
  ['booking', 'categories.daytime', 'DayTime etiketi', 'DayTime label', 'DayTime', 'Daytime'],
  ['booking', 'categories.bosphorus', 'Boğaz Turu etiketi', 'Bosphorus label', 'Boğaz Turu', 'Bosphorus Cruise'],
  ['marquee', 'marquee.0', 'Şerit 1', 'Strip 1', 'Ücretsiz iptal', 'Free cancellation'],
  ['marquee', 'marquee.1', 'Şerit 2', 'Strip 2', 'Anında onay', 'Instant confirmation'],
  ['marquee', 'marquee.2', 'Şerit 3', 'Strip 3', 'Yerel rota', 'Local routes'],
  ['marquee', 'marquee.3', 'Şerit 4', 'Strip 4', 'En iyi fiyat', 'Best price'],
  ['marquee', 'marquee.4', 'Şerit 5', 'Strip 5', '7/24 destek', '24/7 support'],
  ['tours', 'tours.select', 'Tur kartı rezervasyon butonu', 'Tour card booking button', 'Rezervasyon Yap', 'Book now'],
  ['tours', 'tours.info', 'Tur kartı bilgi butonu', 'Tour card details button', 'Tur bilgisi', 'Tour details'],
  ['why', 'why.score', 'Gösterilen puan', 'Displayed rating', '4.9', '4.9'],
  ['stories', 'story.note', 'Görsel üstü not', 'Image note', 'İstanbul’a bir de\nburadan bak.', 'See Istanbul from\na different side.'],
  ['stories', 'story.author', 'Yorum sahibi', 'Review author', 'Elif & Mert', 'Elif & Mert'],
  ['stories', 'story.initials', 'Yorum sahibi baş harfleri', 'Review initials', 'EM', 'EM'],
  ['stories', 'story.instagramLabel', 'Instagram butonu yazısı', 'Instagram button label', 'Instagram’da takip et', 'Follow us on Instagram'],
  ['stories', 'story.instagramUrl', 'Instagram profil bağlantısı', 'Instagram profile link', 'https://www.instagram.com/denturpereme/', 'https://www.instagram.com/denturpereme/'],
  ['footer', 'footer.tagline', 'Alt bilgi sloganı', 'Footer tagline', 'İstanbul’un en güzel haline,\ndenizden tanış.', 'Meet Istanbul at its best,\nfrom the water.'],
  ['footer', 'footer.email', 'Alt bilgi iletişim e-postası', 'Footer contact email', 'merhaba@peremetours.com', 'merhaba@peremetours.com'],
  ['footer', 'footer.copyright', 'Telif yazısı', 'Copyright text', '© 2026 Dentur | Pereme Tours', '© 2026 Dentur | Pereme Tours'],
  ['footer', 'footer.0.0', 'Keşfet sütun başlığı', 'Explore column title', 'Keşfet', 'Explore'],
  ['footer', 'footer.0.1', 'Tüm turlar bağlantısı', 'All tours link', 'Tüm turlar', 'All tours'],
  ['footer', 'footer.0.2', 'Boğaz bağlantısı', 'Bosphorus link', 'Boğaz Turu', 'Bosphorus Cruise'],
  ['footer', 'footer.0.3', 'Türk Gecesi bağlantısı', 'Turkish Night link', 'Türk Gecesi', 'Turkish Night'],
  ['footer', 'footer.0.4', 'DayTime bağlantısı', 'DayTime link', 'DayTime', 'Daytime'],
  ['footer', 'footer.1.0', 'Pereme sütun başlığı', 'Pereme column title', 'Pereme', 'Pereme'],
  ['footer', 'footer.1.1', 'Hakkımızda bağlantısı', 'About us link', 'Hakkımızda', 'About us'],
  ['footer', 'footer.1.2', 'Hikâyeler bağlantısı', 'Stories link', 'Hikâyeler', 'Stories'],
  ['footer', 'footer.1.3', 'SSS bağlantısı', 'FAQ link', 'Sıkça sorulanlar', 'Frequently asked'],
  ['footer', 'footer.1.4', 'İletişim bağlantısı', 'Contact link', 'İletişim', 'Contact'],
  ['footer', 'footer.2.0', 'Yardım sütun başlığı', 'Support column title', 'Yardım', 'Support'],
  ['footer', 'footer.2.1', 'KVKK bağlantısı', 'KVKK link', 'KVKK Aydınlatma Metni', 'KVKK Notice'],
  ['footer', 'footer.2.2', 'Mesafeli satış sözleşmesi bağlantısı', 'Distance sales agreement link', 'Mesafeli Satış Sözleşmesi', 'Distance Sales Agreement'],
] as const

export const homepageImages = [
  { key: 'hero', tr: 'Ana kapak görseli', en: 'Main cover image', fallback: '/assets/ad2ca4f6-d888-4621-b0c1-b3db5903f0ac.webp' },
  { key: 'final', tr: 'Alt rezervasyon bannerı', en: 'Bottom booking banner', fallback: '/assets/ad2ca4f6-d888-4621-b0c1-b3db5903f0ac.webp' },
  { key: 'storyMain', tr: 'Hikâye büyük görseli', en: 'Large story image', fallback: '/assets/tour-sunset.webp' },
  { key: 'storySmall', tr: 'Hikâye küçük görseli', en: 'Small story image', fallback: '/assets/tour-private.webp' },
] as const

export function normalizeHomepage(document: HomepageContentDocument): HomepageContentDocument {
  const defaults = (language: 'tr' | 'en') => Object.fromEntries(homepageTextFields.map(field => [field[1], field[language === 'tr' ? 4 : 5]]))
  return { ...document, images: document.images ?? {}, imagePositions: document.imagePositions ?? {}, hiddenSections: document.hiddenSections ?? [], announcements: document.announcements ?? [], storyPhotos: document.storyPhotos ?? [],
    tr: { ...document.tr, texts: { ...defaults('tr'), ...document.tr.texts } },
    en: { ...document.en, texts: { ...defaults('en'), ...document.en.texts } } }
}
