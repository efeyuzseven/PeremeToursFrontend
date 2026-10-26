import {
  ArrowDown,
  ArrowRight,
  Camera,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  Globe2,
  Heart,
  MapPin,
  Menu,
  Minus,
  Play,
  Plus,
  Quote,
  Search,
  ShieldCheck,
  Megaphone,
  Sparkles,
  Star,
  UserRound,
  Users,
  Waves,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { panelHome } from './auth/roles'
import { normalizeHomepage, type HomepageContentDocument } from './content/homepage'
import { apiBaseUrl, apiRequest } from './lib/api'
import { INSTAGRAM_PROFILE_URL, setPageMetadata, siteScrollBehavior, SITE_NAME } from './lib/site'
import { BookingDrawer } from './components/BookingDrawer'
import AccountMenu from './components/AccountMenu'
import { categoryPath, tourCategories, tourPath } from './content/tour-pages'

type Language = 'tr' | 'en'
type Category = 'bosphorus' | 'turkish-night' | 'sunset' | 'daytime'
type CategoryFilter = 'all' | Category
type LocalizedText = Record<Language, string>

type CatalogTour = {
  externalTourId: number
  externalCategoryId: number
  categoryKey: Category
  categoryName: string
  name: string
  titleTr?: string | null
  titleEn?: string | null
  descriptionTr?: string | null
  descriptionEn?: string | null
  badgeTr?: string | null
  badgeEn?: string | null
  imageUrl?: string | null
  sortOrder?: number
}

type Tour = {
  id: number
  category: Category
  badge: LocalizedText
  title: LocalizedText
  description: LocalizedText
  duration: LocalizedText
  location: LocalizedText
  rating: number
  reviews: number
  live?: boolean
  image: string
  imagePosition?: string
  remaining?: number
  sortOrder?: number
}

const localized = (tr: string, en: string): LocalizedText => ({ tr, en })

const fallbackTours: Tour[] = [
  {
    id: 1,
    category: 'bosphorus',
    badge: localized('En çok sevilen', 'Guest favourite'),
    title: localized('Boğaz Turu', 'Bosphorus Cruise'),
    description: localized(
      'İstanbul’un iki yakasını, saraylarını ve yalılarını denizden keşfet.',
      'Discover both shores, palaces and waterfront mansions from the sea.',
    ),
    duration: localized('1,5 saat', '1.5 hours'),
    location: localized('İstanbul Boğazı', 'Istanbul Bosphorus'),
    rating: 4.9,
    reviews: 328,
    image: '/assets/hero-bosphorus.webp',
    imagePosition: '38% center',
    remaining: 9,
  },
  {
    id: 2,
    category: 'turkish-night',
    badge: localized('Geceye özel', 'Made for the night'),
    title: localized('Türk Gecesi Dinner Cruise', 'Turkish Night Dinner Cruise'),
    description: localized(
      'Akşam yemeği, canlı gösteriler ve ışıklar içindeki İstanbul aynı teknede.',
      'Dinner, live performances and Istanbul’s night lights aboard one cruise.',
    ),
    duration: localized('3 saat', '3 hours'),
    location: localized('Kabataş kalkışlı', 'Departs from Kabataş'),
    rating: 4.8,
    reviews: 214,
    image: '/assets/tour-dinner.webp',
    remaining: 4,
  },
  {
    id: 3,
    category: 'sunset',
    badge: localized('Altın saat', 'Golden hour'),
    title: localized('Sunset', 'Sunset Cruise'),
    description: localized(
      'Gün batımının renkleri, Boğaz manzarası ve sakin bir akşam yolculuğu.',
      'Golden-hour colours, Bosphorus views and an unhurried evening cruise.',
    ),
    duration: localized('2 saat', '2 hours'),
    location: localized('Kabataş kalkışlı', 'Departs from Kabataş'),
    rating: 4.9,
    reviews: 286,
    image: '/assets/tour-sunset.webp',
    remaining: 6,
  },
  {
    id: 4,
    category: 'daytime',
    badge: localized('Yeni rota', 'New route'),
    title: localized('DayTime', 'Daytime Cruise'),
    description: localized(
      'Gün ışığında İstanbul silueti ve Boğaz’ın kıyı hikâyeleriyle dolu bir rota.',
      'A daylight route through Istanbul’s skyline and the stories of its shores.',
    ),
    duration: localized('2 saat', '2 hours'),
    location: localized('Kabataş kalkışlı', 'Departs from Kabataş'),
    rating: 4.7,
    reviews: 142,
    image: '/assets/hero-bosphorus.webp',
    imagePosition: '38% center',
    remaining: 9,
  },
]

const experienceKeys: Category[] = ['turkish-night', 'sunset', 'daytime', 'bosphorus']
const categoryKeys: CategoryFilter[] = ['all', ...experienceKeys]
const categoryPriority = new Map(experienceKeys.map((category, index) => [category, index]))

const tourOrder = (tour: Tour) => tour.sortOrder
  ?? (categoryPriority.get(tour.category) ?? 99) * 100

const orderTours = (items: Tour[]) => [...items].sort((left, right) =>
  tourOrder(left) - tourOrder(right) || left.id - right.id,
)

const resolveCatalogImage = (imageUrl: string | null | undefined, fallback: string) => {
  if (!imageUrl) return fallback
  return imageUrl.startsWith('/') ? `${apiBaseUrl}${imageUrl}` : imageUrl
}

const isCategory = (value: string): value is Category => experienceKeys.includes(value as Category)

const mergeCatalogTours = (catalog: CatalogTour[]): Tour[] => {
  const liveTours = catalog.flatMap((item) => {
    if (!isCategory(item.categoryKey)) return []
    const template = fallbackTours.find((tour) => tour.category === item.categoryKey)
    if (!template) return []
    return [{
      ...template,
      id: item.externalTourId,
      live: true,
      title: localized(item.titleTr || item.name, item.titleEn || item.name),
      description: localized(
        item.descriptionTr || template.description.tr,
        item.descriptionEn || template.description.en,
      ),
      badge: localized(
        item.badgeTr || template.badge.tr,
        item.badgeEn || template.badge.en,
      ),
      image: resolveCatalogImage(item.imageUrl, template.image),
      sortOrder: item.sortOrder,
    }]
  })
  return orderTours(liveTours)
}

const copy = {
  tr: {
    languageName: 'Türkçe',
    nav: [['Turlar', '#turlar'], ['Duyurular', '#duyurular'], ['Neden Pereme?', '#neden-biz'], ['Hikâyeler', '#hikayeler']],
    a11y: {
      mainNav: 'Ana menü', language: 'Dil seçimi', openMenu: 'Menüyü aç', closeMenu: 'Menüyü kapat', closeBooking: 'Rezervasyonu kapat',
      decrease: 'Misafir azalt', increase: 'Misafir artır', scrollTours: 'Turlara kaydır', tourCategories: 'Tur kategorileri',
      previousReview: 'Önceki yorum', nextReview: 'Sonraki yorum',
    },
    hero: {
      eyebrow: 'İstanbul, suyun öteki tarafından', lead: 'Şehri izleme.', accent: 'Onunla ak.',
      description: 'Boğaz’ın ritmini, gün batımının rengini ve İstanbul’un hiç acele etmeyen halini keşfet.',
      toursLink: 'Turları incele', scroll: 'Keşfet', cardLabel: 'İstanbul Boğazı’nda',
      cardCount: '4 deneyim', cardLead: 'Her saate', cardAccent: 'başka bir İstanbul.',
      cardTypes: ['Türk Gecesi', 'Sunset', 'DayTime', 'Boğaz Turu'], cardNote: 'Rotanı seç, İstanbul’u denizden keşfet.',
    },
    booking: {
      experience: 'Deneyim', date: 'Tarih', guest: 'Misafir', guests: (count: number) => `${count} kişi`,
      search: 'Uygun turları bul',
    },
    categories: { all: 'Tümü', bosphorus: 'Boğaz Turu', 'turkish-night': 'Türk Gecesi', sunset: 'Sunset', daytime: 'DayTime' },
    marquee: ['Ücretsiz iptal', 'Anında onay', 'Yerel rota', 'En iyi fiyat', '7/24 destek'],
    tours: {
      spots: (count: number) => `Bu tarih için ${count} yer kaldı`, perPerson: 'Kişi başı', select: 'Rezervasyon Yap', info: 'Tur bilgisi',
      favouriteAdd: 'favorilere ekle', favouriteRemove: 'favorilerden çıkar',
    },
    experience: {
      eyebrow: 'Bir turdan fazlası', lead: 'Şehir denizde', accent: 'başka konuşur.',
      description: 'Kalabalığı kıyıda bırak. İstanbul’un sesini martılardan, ışığını suyun üstünden, hikâyesini yerel anlatıcılardan dinle.',
      features: [['Özenli rotalar', 'Turistik kalabalıktan uzak'], ['Gerçek İstanbul', 'Yerel hikâyeler ve tatlar'], ['Küçük gruplar', 'Daha kişisel bir deneyim']],
    },
    announcements: { eyebrow: 'Duyurular', lead: 'Pereme’den', accent: 'haberler', more: 'Detaylar' },
    why: {
      eyebrow: 'İçin rahat olsun', lead: 'Biletini al.', accent: 'Gerisini akışa bırak.', reviews: '840+ mutlu misafir',
      benefits: [
        ['Güvenli rezervasyon', 'Şeffaf fiyatlar, anında onay ve güvenli ödeme altyapısı.'],
        ['Planın değişebilir', 'Turdan 24 saat öncesine kadar ücretsiz iptal kolaylığı.'],
        ['Yanında bir insan var', 'Rezervasyon öncesi ve sonrası gerçek ekip desteği.'],
        ['Seçilmiş deneyimler', 'Her tekne ve rota Pereme ekibi tarafından yerinde denenir.'],
      ],
    },
    story: {
      eyebrow: 'Instagram’dan Pereme', lead: 'Boğaz’daki anlara', accent: 'yakından bak.',
      description: 'Dentur | Pereme Tours Instagram hesabındaki güncel videoları ve misafir anlarını keşfet.',
      note: 'İstanbul’a bir de\nburadan bak.',
      quote: '“Gün batımı çok güzeldi ama asıl fark, ekibin küçük detayları düşünmesiydi. Kendimizi turist gibi değil, İstanbul’un misafiri gibi hissettik.”',
      meta: 'Ankara · Gün Batımı Turu',
    },
    final: { pre: 'Sıradaki güzel anın', title: 'kıyıda beklemiyor.', action: 'Yerini ayır' },
    footer: {
      tagline: 'İstanbul’un en güzel haline,\ndenizden tanış.',
      columns: [
        ['Keşfet', 'Tüm turlar', 'Boğaz Turu', 'Türk Gecesi', 'DayTime'],
        ['Pereme', 'Hakkımızda', 'Hikâyeler', 'Sıkça sorulanlar', 'İletişim'],
        ['Yardım', 'KVKK Aydınlatma Metni', 'Mesafeli Satış Sözleşmesi'],
      ],
      copyright: `© 2026 ${SITE_NAME}`,
    },
    drawer: {
      successLabel: 'Talebin hazır', successTitle: 'Şimdi ödeme altyapısını bekliyoruz.',
      successText: 'Tasarım demosunda rezervasyon adımların başarıyla çalışıyor. Gerçek bilet ve ödeme entegrasyonu sonraki fazda eklenecek.',
      back: 'Turlara dön', summary: 'Rezervasyon özeti', lead: 'Yerini ayır,', accent: 'anı kaçırma.', guestCount: 'Misafir sayısı',
      instant: 'Anında onay', cancellation: '24 saate kadar ücretsiz iptal', total: 'Toplam',
      forGuests: (count: number) => `${count} misafir için`, continue: 'Rezervasyona devam et',
      demo: 'Bu bir tasarım demosudur, kartından çekim yapılmaz.',
    },
  },
  en: {
    languageName: 'English',
    nav: [['Tours', '#turlar'], ['Announcements', '#duyurular'], ['Why Pereme?', '#neden-biz'], ['Stories', '#hikayeler']],
    a11y: {
      mainNav: 'Main navigation', language: 'Choose language', openMenu: 'Open menu', closeMenu: 'Close menu', closeBooking: 'Close booking',
      decrease: 'Remove guest', increase: 'Add guest', scrollTours: 'Scroll to tours', tourCategories: 'Tour categories',
      previousReview: 'Previous review', nextReview: 'Next review',
    },
    hero: {
      eyebrow: 'Istanbul, from the other side of the water', lead: 'Don’t just watch.', accent: 'Flow with it.',
      description: 'Meet the rhythm of the Bosphorus, the colour of sunset and the unhurried side of Istanbul.',
      toursLink: 'Explore tours', scroll: 'Explore', cardLabel: 'On the Bosphorus',
      cardCount: '4 experiences', cardLead: 'A different Istanbul', cardAccent: 'for every moment.',
      cardTypes: ['Turkish Night', 'Sunset', 'DayTime', 'Bosphorus'], cardNote: 'Choose your route and discover Istanbul from the water.',
    },
    booking: {
      experience: 'Experience', date: 'Date', guest: 'Guests', guests: (count: number) => `${count} ${count === 1 ? 'guest' : 'guests'}`,
      search: 'Find available tours',
    },
    categories: { all: 'All', bosphorus: 'Bosphorus Cruise', 'turkish-night': 'Turkish Night', sunset: 'Sunset', daytime: 'Daytime' },
    marquee: ['Free cancellation', 'Instant confirmation', 'Local routes', 'Best price', '24/7 support'],
    tours: {
      spots: (count: number) => `${count} spots left for this date`, perPerson: 'Per person', select: 'Book now', info: 'Tour details',
      favouriteAdd: 'add to favourites', favouriteRemove: 'remove from favourites',
    },
    experience: {
      eyebrow: 'More than a tour', lead: 'The city speaks', accent: 'differently at sea.',
      description: 'Leave the crowds ashore. Hear Istanbul through the gulls, see its light on the water and discover its stories with local hosts.',
      features: [['Thoughtful routes', 'Away from the tourist crowds'], ['The real Istanbul', 'Local stories and flavours'], ['Small groups', 'A more personal experience']],
    },
    announcements: { eyebrow: 'Announcements', lead: 'News from', accent: 'Pereme', more: 'Details' },
    why: {
      eyebrow: 'You’re in good hands', lead: 'Book your ticket.', accent: 'Leave the rest to the flow.', reviews: '840+ happy guests',
      benefits: [
        ['Secure booking', 'Transparent prices, instant confirmation and secure payments.'],
        ['Plans can change', 'Enjoy free cancellation up to 24 hours before your tour.'],
        ['Real people, right here', 'Genuine support before and after your reservation.'],
        ['Handpicked experiences', 'Every boat and route is tested by the Pereme team.'],
      ],
    },
    story: {
      eyebrow: 'Pereme on Instagram', lead: 'See moments from', accent: 'the Bosphorus.',
      description: 'Discover recent videos and guest moments from the Dentur | Pereme Tours Instagram account.',
      note: 'See Istanbul from\na different side.',
      quote: '“The sunset was beautiful, but the real difference was the team’s attention to every small detail. We felt like guests of Istanbul, not tourists.”',
      meta: 'Ankara · Sunset Cruise',
    },
    final: { pre: 'Your next beautiful moment', title: 'isn’t waiting ashore.', action: 'Save your place' },
    footer: {
      tagline: 'Meet Istanbul at its best,\nfrom the water.',
      columns: [
        ['Explore', 'All tours', 'Bosphorus Cruise', 'Turkish Night', 'Daytime'],
        ['Pereme', 'About us', 'Stories', 'Frequently asked', 'Contact'],
        ['Support', 'KVKK Notice', 'Distance Sales Agreement'],
      ],
      copyright: `© 2026 ${SITE_NAME}`,
    },
    drawer: {
      successLabel: 'Your request is ready', successTitle: 'The payment connection comes next.',
      successText: 'The booking flow is working in this design demo. Live ticketing and payment will be connected in the next phase.',
      back: 'Back to tours', summary: 'Booking summary', lead: 'Save your place,', accent: 'don’t miss the moment.',
      guestCount: 'Number of guests', instant: 'Instant confirmation', cancellation: 'Free cancellation up to 24 hours', total: 'Total',
      forGuests: (count: number) => `for ${count} ${count === 1 ? 'guest' : 'guests'}`, continue: 'Continue booking',
      demo: 'This is a design demo. Your card will not be charged.',
    },
  },
}

const toIsoDate = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseIsoDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const tomorrow = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return toIsoDate(date)
}

const today = toIsoDate(new Date())

const instagramEmbedUrl = (url: string) => {
  try {
    const parsed = new URL(url)
    const pathname = parsed.pathname.replace(/\/+$/, '')
    return `${parsed.origin}${pathname}/embed/`
  } catch {
    return ''
  }
}

function Logo({ light = false, language = 'tr' }: { light?: boolean; language?: Language }) {
  return (
    <a href="#top" className={`logo ${light ? 'logo--light' : ''}`} aria-label={language === 'tr' ? 'Dentur Pereme ana sayfa' : 'Dentur Pereme home'}>
      <img src="/assets/pereme-logo.svg" alt="" />
    </a>
  )
}

function App() {
  const { user } = useAuth()
  const [language, setLanguage] = useState<Language>(() => window.localStorage.getItem('pereme-language') === 'en' ? 'en' : 'tr')
  const [languageMenu, setLanguageMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [tours, setTours] = useState<Tour[]>(() => orderTours(fallbackTours))
  const [homepageContent, setHomepageContent] = useState<HomepageContentDocument | null>(null)
  // Until the admin-managed content has loaded, images stay empty so the built-in defaults never flash before the real ones.
  const [homepageReady, setHomepageReady] = useState(false)
  const [date, setDate] = useState(tomorrow())
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const value = parseIsoDate(tomorrow())
    return new Date(value.getFullYear(), value.getMonth(), 1)
  })
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [guests, setGuests] = useState(1)
  const [experience, setExperience] = useState<Category>('turkish-night')
  const [experienceMenuOpen, setExperienceMenuOpen] = useState(false)
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [favorites, setFavorites] = useState<number[]>([])
  const languagePickerRef = useRef<HTMLDivElement>(null)
  const experiencePickerRef = useRef<HTMLDivElement>(null)
  const calendarPickerRef = useRef<HTMLDivElement>(null)
  const page = homepageContent?.[language]
  const base = copy[language]
  const t = (key: string, fallback: string) => page?.texts?.[key] ?? fallback
  const hidden = (key: string) => homepageContent?.hiddenSections?.includes(key) ?? false
  const announcements = hidden('announcements') ? [] : (homepageContent?.announcements ?? []).filter((item) => item.isVisible && item.tr.title.trim())
  const image = (key: string, fallback: string) => {
    if (!homepageReady) return undefined
    const url = homepageContent?.images?.[key] || fallback
    return url.startsWith('/api/') ? `${apiBaseUrl}${url}` : url
  }
  const heroImage = image('hero', '/assets/ad2ca4f6-d888-4621-b0c1-b3db5903f0ac.webp')
  const finalImage = image('final', '/assets/ad2ca4f6-d888-4621-b0c1-b3db5903f0ac.webp')
  const position = (key: string) => homepageContent?.imagePositions?.[key]
  const c = { ...base,
    // The second item used to be "Our services" (nav.1); announcements use their own key so old saved labels are not reused.
    nav: base.nav.map(([label, href], index) => [t(index === 1 ? 'nav.announcements' : `nav.${index}`, label), href]).filter(([, href]) =>
      href === '#duyurular' ? announcements.length > 0 : !hidden(({ '#neden-biz': 'why', '#hikayeler': 'stories' } as Record<string, string>)[href])),
    hero: { ...base.hero, ...Object.fromEntries(Object.entries(base.hero).filter(([, value]) => typeof value === 'string').map(([key, value]) => [key, t(`hero.${key}`, value as string)])),
      cardTypes: base.hero.cardTypes.map((value, index) => t(`hero.cardTypes.${index}`, value)) },
    booking: { ...base.booking, experience: t('booking.experience', base.booking.experience), date: t('booking.date', base.booking.date), guest: t('booking.guest', base.booking.guest), search: t('booking.search', base.booking.search) },
    categories: { all: t('categories.all', base.categories.all), 'turkish-night': t('categories.turkishNight', base.categories['turkish-night']), sunset: t('categories.sunset', base.categories.sunset), daytime: t('categories.daytime', base.categories.daytime), bosphorus: t('categories.bosphorus', base.categories.bosphorus) },
    marquee: base.marquee.map((value, index) => t(`marquee.${index}`, value)),
    tours: { ...base.tours, select: t('tours.select', base.tours.select), info: t('tours.info', base.tours.info) },
    announcements: { eyebrow: t('announcements.eyebrow', base.announcements.eyebrow), lead: t('announcements.lead', base.announcements.lead),
      accent: t('announcements.accent', base.announcements.accent), more: t('announcements.more', base.announcements.more) },
    story: { ...base.story, note: t('story.note', base.story.note) },
    footer: { ...base.footer, tagline: t('footer.tagline', base.footer.tagline), copyright: t('footer.copyright', base.footer.copyright), columns: base.footer.columns.map((column, index) => column.map((value, entry) => t(`footer.${index}.${entry}`, value))) },
  }

  useEffect(() => {
    const controller = new AbortController()
    apiRequest<CatalogTour[]>('/api/v1/tours', { signal: controller.signal })
      .then((catalog) => {
        if (controller.signal.aborted) return
        setTours(mergeCatalogTours(catalog))
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    apiRequest<HomepageContentDocument>('/api/v1/site-content/homepage', { signal: controller.signal, cache: 'no-store' })
      .then(result => setHomepageContent(normalizeHomepage(result)))
      .catch(() => undefined)
      // If the content cannot be loaded, fall back to the built-in images.
      .finally(() => { if (!controller.signal.aborted) setHomepageReady(true) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    setPageMetadata({ language })
    window.localStorage.setItem('pereme-language', language)
  }, [language])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!languagePickerRef.current?.contains(event.target as Node)) setLanguageMenu(false)
      if (!experiencePickerRef.current?.contains(event.target as Node)) setExperienceMenuOpen(false)
      if (!calendarPickerRef.current?.contains(event.target as Node)) setCalendarOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setBookingOpen(false)
        setMobileMenu(false)
        setLanguageMenu(false)
        setExperienceMenuOpen(false)
        setCalendarOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = bookingOpen || mobileMenu ? 'hidden' : ''
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [bookingOpen, mobileMenu])

  const filteredTours = useMemo(() => filter === 'all' ? tours : tours.filter((tour) => tour.category === filter), [filter, tours])
  const selectedDate = parseIsoDate(date)
  const locale = language === 'tr' ? 'tr-TR' : 'en-US'
  const formattedDate = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(selectedDate)
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(calendarMonth)
  const weekDays = language === 'tr' ? ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'] : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
  const firstDayOffset = (new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay() + 6) % 7
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate()
  const calendarDays = [...Array<null>(firstDayOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)]
  const currentMonth = parseIsoDate(today)
  const previousMonthDisabled = calendarMonth.getFullYear() === currentMonth.getFullYear() && calendarMonth.getMonth() === currentMonth.getMonth()

  const moveCalendarMonth = (direction: -1 | 1) => {
    setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() + direction, 1))
  }

  const chooseDate = (day: number) => {
    const nextDate = toIsoDate(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day))
    if (nextDate < today) return
    setDate(nextDate)
    setCalendarOpen(false)
  }

  const changeLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage)
    setLanguageMenu(false)
  }

  const openBooking = (tour?: Tour) => {
    const target = tour ?? tours.find((item) => item.category === experience && item.live) ?? tours.find((item) => item.live)
    if (!target?.live) return
    setSelectedTour(target)
    setBookingOpen(true)
  }

  const findTours = () => {
    setFilter(experience)
    document.getElementById('turlar')?.scrollIntoView({ behavior: siteScrollBehavior() })
  }

  const benefits = page?.why.benefits
    ?? c.why.benefits.map(([title, description]) => ({ title, description }))
  const instagramUrls = homepageContent?.instagramUrls ?? []

  return (
    <main id="top">
      <header className={`site-header ${scrolled ? 'site-header--scrolled' : ''}`}>
        <div className="shell header__inner">
          <Logo light={!scrolled} language={language} />
          <nav className="desktop-nav" aria-label={c.a11y.mainNav}>{c.nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
          <div className="header__actions">
            <AccountMenu language={language} label={t('account', language === 'tr' ? 'Hesabım' : 'My account')} />
            <div className="language-picker" ref={languagePickerRef}>
              <button className="language" type="button" aria-label={c.a11y.language} aria-haspopup="menu" aria-expanded={languageMenu} onClick={() => setLanguageMenu((open) => !open)}>
                <Globe2 size={17} /> {language.toUpperCase()} <ChevronDown size={14} />
              </button>
              <div className={`language-menu ${languageMenu ? 'language-menu--open' : ''}`} role="menu">
                {(['tr', 'en'] as Language[]).map((item) => (
                  <button key={item} type="button" role="menuitem" className={language === item ? 'active' : ''} onClick={() => changeLanguage(item)}>
                    <span>{item.toUpperCase()}</span><strong>{copy[item].languageName}</strong>{language === item && <Check size={16} />}
                  </button>
                ))}
              </div>
            </div>
            <button className="menu-button" type="button" aria-label={c.a11y.openMenu} aria-expanded={mobileMenu} onClick={() => setMobileMenu(true)}><Menu /></button>
          </div>
        </div>
      </header>

      <div className={`mobile-menu ${mobileMenu ? 'mobile-menu--open' : ''}`} aria-hidden={!mobileMenu}>
        <button className="mobile-menu__close" onClick={() => setMobileMenu(false)} aria-label={c.a11y.closeMenu}><X /></button>
        <Logo light language={language} />
        <nav>{c.nav.map(([label, href]) => <a key={href} href={href} onClick={() => setMobileMenu(false)}>{label} <ArrowRight /></a>)}<Link to={user ? '/hesabim' : '/login'} onClick={() => setMobileMenu(false)}>{t('account', language === 'tr' ? 'Hesabım' : 'My account')} <UserRound /></Link>{panelHome(user?.role) && <Link to={panelHome(user?.role)!} onClick={() => setMobileMenu(false)}>{language === 'tr' ? 'Yönetim paneli' : 'Admin panel'}</Link>}</nav>
        <div className="mobile-languages" aria-label={c.a11y.language}>
          {(['tr', 'en'] as Language[]).map((item) => <button key={item} className={language === item ? 'active' : ''} type="button" onClick={() => changeLanguage(item)}>{item.toUpperCase()} <span>{copy[item].languageName}</span></button>)}
        </div>
      </div>

      <section className="hero" aria-labelledby="hero-title">
        <div className={`hero__image${heroImage ? ' is-ready' : ''}`} style={{ ...(heroImage ? { backgroundImage: `url("${heroImage}")` } : {}), ...(position('hero') ? { backgroundPosition: position('hero') } : {}) }} /><div className="hero__shade" /><div className="hero__orb hero__orb--one" /><div className="hero__orb hero__orb--two" />
        <svg className="hero__route-map" viewBox="0 0 700 360" aria-hidden="true">
          <path d="M20 290C135 238 177 300 281 231C374 169 440 233 520 143C571 86 622 94 680 54" />
          <circle cx="281" cy="231" r="5" /><circle cx="520" cy="143" r="5" /><circle cx="680" cy="54" r="5" />
        </svg>
        <div className="shell hero__content">
          <div className="hero__copy">
            <div className="eyebrow eyebrow--light"><span className="eyebrow__pulse" /> {c.hero.eyebrow}</div>
            <h1 id="hero-title">{page?.hero.lead ?? c.hero.lead}<br /><em>{page?.hero.accent ?? c.hero.accent}</em></h1>
            <p>{page?.hero.description ?? c.hero.description}</p>
            <div className="hero__buttons">
              <a className="play-link" href="#turlar"><span><Play size={15} fill="currentColor" /></span> {c.hero.toursLink}</a>
            </div>
          </div>
          {!hidden('heroCard') && <div className="hero__experience-card">
            <div className="experience-card__top"><span><Waves size={15} /> {c.hero.cardLabel}</span><i>{c.hero.cardCount}</i></div>
            <p className="experience-card__lead">{c.hero.cardLead}<br /><em>{c.hero.cardAccent}</em></p>
            <div className="experience-card__types">{tourCategories.map((category, index) => <Link key={category} to={categoryPath(category)}><b aria-hidden="true">0{index + 1}</b>{c.hero.cardTypes[index]}</Link>)}</div>
            <div className="experience-card__note"><Sparkles size={14} /> {c.hero.cardNote}</div>
          </div>}
          <div className="hero__side-note" aria-hidden="true"><span>41° 02′ N</span><div /><span>29° 00′ E</span></div>
          <a className="scroll-cue" href="#turlar" aria-label={c.a11y.scrollTours}><span>{c.hero.scroll}</span><ArrowDown size={18} /></a>
        </div>

        <div className="shell booking-bar-wrap">
          <div className="booking-bar">
            <div className={`booking-field booking-field--picker ${experienceMenuOpen ? 'booking-field--open' : ''}`} ref={experiencePickerRef}>
              <span className="booking-field__icon"><Compass size={21} /></span>
              <button className="booking-picker-trigger" type="button" aria-haspopup="listbox" aria-expanded={experienceMenuOpen} onClick={() => { setExperienceMenuOpen((open) => !open); setCalendarOpen(false) }}><span><small>{c.booking.experience}</small><strong>{c.categories[experience]}</strong></span><ChevronDown /></button>
              <div className={`booking-popover experience-picker ${experienceMenuOpen ? 'booking-popover--open' : ''}`} role="listbox" aria-label={c.booking.experience}>
                <div className="booking-popover__label">{language === 'tr' ? 'Deneyimini seç' : 'Choose your experience'}</div>
                {experienceKeys.map((category, index) => <button key={category} type="button" role="option" aria-selected={experience === category} className={experience === category ? 'active' : ''} onClick={() => { setExperience(category); setExperienceMenuOpen(false) }}><span>0{index + 1}</span><strong>{c.categories[category]}</strong>{experience === category && <Check />}</button>)}
              </div>
            </div>
            <div className={`booking-field booking-field--picker booking-field--date ${calendarOpen ? 'booking-field--open' : ''}`} ref={calendarPickerRef}>
              <span className="booking-field__icon"><CalendarDays size={21} /></span>
              <button className="booking-picker-trigger" type="button" aria-haspopup="dialog" aria-expanded={calendarOpen} onClick={() => { setCalendarMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)); setCalendarOpen((open) => !open); setExperienceMenuOpen(false) }}><span><small>{c.booking.date}</small><strong>{formattedDate}</strong></span><ChevronDown /></button>
              <div className={`booking-popover calendar-picker ${calendarOpen ? 'booking-popover--open' : ''}`} role="dialog" aria-label={language === 'tr' ? 'Tarih seçimi' : 'Choose a date'}>
                <div className="calendar-picker__header"><div><small>{language === 'tr' ? 'Tur tarihi' : 'Tour date'}</small><strong>{monthLabel}</strong></div><span><button type="button" disabled={previousMonthDisabled} aria-label={language === 'tr' ? 'Önceki ay' : 'Previous month'} onClick={() => moveCalendarMonth(-1)}><ChevronLeft /></button><button type="button" aria-label={language === 'tr' ? 'Sonraki ay' : 'Next month'} onClick={() => moveCalendarMonth(1)}><ChevronRight /></button></span></div>
                <div className="calendar-picker__weekdays">{weekDays.map((day) => <span key={day}>{day}</span>)}</div>
                <div className="calendar-picker__days">{calendarDays.map((day, index) => day === null ? <span key={`blank-${index}`} /> : (() => { const value = toIsoDate(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)); const isPast = value < today; return <button key={value} type="button" disabled={isPast} className={`${value === date ? 'selected' : ''} ${value === today ? 'today' : ''}`} aria-label={new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day))} onClick={() => chooseDate(day)}>{day}</button> })())}</div>
                <div className="calendar-picker__footer"><span>{language === 'tr' ? 'Seçilen tarih' : 'Selected date'} <strong>{formattedDate}</strong></span><button type="button" onClick={() => { const value = parseIsoDate(today); setCalendarMonth(new Date(value.getFullYear(), value.getMonth(), 1)); setDate(today); setCalendarOpen(false) }}>{language === 'tr' ? 'Bugün' : 'Today'}</button></div>
              </div>
            </div>
            <div className="booking-field booking-field--guests">
              <span className="booking-field__icon"><Users size={21} /></span><span><small>{c.booking.guest}</small><strong>{c.booking.guests(guests)}</strong></span>
              <div className="stepper" aria-label={c.drawer.guestCount}><button type="button" onClick={() => setGuests(Math.max(1, guests - 1))} aria-label={c.a11y.decrease}><Minus size={15} /></button><button type="button" onClick={() => setGuests(Math.min(12, guests + 1))} aria-label={c.a11y.increase}><Plus size={15} /></button></div>
            </div>
            <button className="search-button" type="button" onClick={findTours}><Search size={20} /> <span>{c.booking.search}</span></button>
          </div>
        </div>
      </section>

      {!hidden('marquee') && <div className="marquee" aria-label={SITE_NAME}>
        <div className="marquee__track">{[0, 1].map((item) => <div className="marquee__group" key={item} aria-hidden={item === 1}>{c.marquee.map((label, index) => <span className="marquee__item" key={index}><span>{label}</span><Sparkles /></span>)}</div>)}</div>
      </div>}

      {/* The tour cards open the section directly and all tours are always shown. */}
      <section className="tours-section tours-section--compact" id="turlar" aria-label={c.a11y.tourCategories}>
        <div className="shell">
          <div className="filters" role="group" aria-label={c.a11y.tourCategories}>{categoryKeys.map((category) => <button key={category} className={filter === category ? 'active' : ''} type="button" onClick={() => setFilter(category)}>{c.categories[category]}</button>)}</div>
          <div className="tour-grid">
            {filteredTours.map((tour, index) => (
              <article className="tour-card" key={tour.id} style={{ '--card-delay': `${index * 80}ms` } as CSSProperties}>
                <div className="tour-card__media">
                  <img src={tour.image} alt="" style={{ objectPosition: tour.imagePosition }} /><div className="tour-card__media-shade" /><span className="tour-card__badge">{tour.badge[language]}</span>
                  <button className={`heart-button ${favorites.includes(tour.id) ? 'heart-button--active' : ''}`} type="button" aria-pressed={favorites.includes(tour.id)} aria-label={`${tour.title[language]} ${favorites.includes(tour.id) ? c.tours.favouriteRemove : c.tours.favouriteAdd}`} onClick={() => setFavorites((items) => items.includes(tour.id) ? items.filter((id) => id !== tour.id) : [...items, tour.id])}><Heart size={19} fill={favorites.includes(tour.id) ? 'currentColor' : 'none'} /></button>
                  <div className="tour-card__rating"><Star size={14} fill="currentColor" /> {tour.rating} <span>({tour.reviews})</span></div>
                </div>
                <div className="tour-card__body">
                  <span className="tour-card__category">{c.categories[tour.category]}</span><h3>{tour.live ? <Link to={tourPath(tour.id)}>{tour.title[language]}</Link> : tour.title[language]}</h3><p>{tour.description[language]}</p>
                  <div className="tour-card__meta"><span><Clock3 size={16} /> {tour.duration[language]}</span><span><MapPin size={16} /> {tour.location[language]}</span></div>
                  <div className="tour-card__footer">
                    {tour.live && <Link className="tour-card__info" to={tourPath(tour.id)} aria-label={`${tour.title[language]} ${c.tours.info}`}>{c.tours.info}</Link>}
                    <button type="button" disabled={!tour.live} onClick={() => openBooking(tour)} aria-label={`${tour.title[language]} ${c.tours.select}`}>{c.tours.select} <ArrowRight size={18} /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {announcements.length > 0 && <section className="services announcements" id="duyurular">
        <div className="shell">
          <div className="section-heading section-heading--light"><div><div className="eyebrow eyebrow--light"><Megaphone size={17} /> {c.announcements.eyebrow}</div><h2>{c.announcements.lead} <em>{c.announcements.accent}</em></h2></div></div>
          <div className="announcement-grid">
            {announcements.map((item) => {
              const text = item[language].title.trim() ? item[language] : item.tr
              const linkLabel = text.linkLabel?.trim() || c.announcements.more
              const imageUrl = item.imageUrl ? (item.imageUrl.startsWith('/api/') ? `${apiBaseUrl}${item.imageUrl}` : item.imageUrl) : null
              return <article className="announcement-card" key={item.id}>
                {imageUrl && <img src={imageUrl} alt="" loading="lazy" />}
                <div className="announcement-card__body">
                  {item.date && <time dateTime={item.date}>{new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${item.date}T12:00:00`))}</time>}
                  <h3>{text.title}</h3>
                  {text.body && <p>{text.body}</p>}
                  {item.linkUrl && (item.linkUrl.startsWith('/')
                    ? <Link to={item.linkUrl}>{linkLabel} <ArrowRight size={16} /></Link>
                    : <a href={item.linkUrl} target="_blank" rel="noopener noreferrer">{linkLabel} <ArrowRight size={16} /></a>)}
                </div>
              </article>
            })}
          </div>
        </div>
      </section>}

      {!hidden('why') && <section className="why" id="neden-biz">
        <div className="shell">
          <div className="why__header"><div><div className="eyebrow"><ShieldCheck size={18} /> {page?.why.eyebrow ?? c.why.eyebrow}</div><h2>{page?.why.lead ?? c.why.lead}<br /><em>{page?.why.accent ?? c.why.accent}</em></h2></div><div className="why__score"><strong>{t('why.score', '4.9')}</strong><span><span className="stars">★★★★★</span> {page?.why.reviews ?? c.why.reviews}</span></div></div>
          <div className="benefit-grid">{benefits.map(({ title, description }, index) => { const Icon = [ShieldCheck, CalendarDays, Users, Compass][index]; return <article key={`${title}-${index}`}><span>0{index + 1}</span><Icon /><h3>{title}</h3><p>{description}</p></article> })}</div>
        </div>
      </section>}

      {!hidden('stories') && <section className="stories" id="hikayeler">
        <div className="shell"><div className="stories__heading"><div className="eyebrow"><Camera size={17} /> {page?.stories.eyebrow ?? c.story.eyebrow}</div><h2>{page?.stories.lead ?? c.story.lead} <em>{page?.stories.accent ?? c.story.accent}</em></h2><p>{page?.stories.description ?? c.story.description}</p></div>
          {instagramUrls.length > 0 ? <div className="instagram-grid">{instagramUrls.map((url) => { const embedUrl = instagramEmbedUrl(url); return embedUrl && <iframe key={url} src={embedUrl} title={`${SITE_NAME} Instagram`} loading="lazy" allowFullScreen /> })}</div> : <div className="stories__inner stories__inner--fallback">
            <div className="story-collage" aria-hidden="true"><img className="story-collage__main" src={image('storyMain', '/assets/tour-sunset.webp')} style={{ objectPosition: position('storyMain') }} alt="" /><img className="story-collage__small" src={image('storySmall', '/assets/tour-private.webp')} style={{ objectPosition: position('storySmall') }} alt="" /><div className="story-collage__note"><span>“</span>{c.story.note.split('\n').map((line, index) => <span className="story-note__line" key={index}>{line}</span>)}</div></div>
            <div className="testimonial"><Quote size={40} /><blockquote>{page?.stories.quote ?? c.story.quote}</blockquote><div className="testimonial__person"><div>{t('story.initials', 'EM')}</div><span><strong>{t('story.author', 'Elif & Mert')}</strong>{page?.stories.meta ?? c.story.meta}</span></div></div>
          </div>}
        </div>
      </section>}

      {!hidden('final') && <section className="final-cta"><div className="final-cta__image" style={{ backgroundImage: `linear-gradient(rgba(7,27,53,.48), rgba(7,27,53,.72))${finalImage ? `, url("${finalImage}")` : ''}`,...(position('final') ? { backgroundPosition: position('final') } : {}) }} /><div className="final-cta__rings" aria-hidden="true"><span /><span /><span /></div><div className="shell final-cta__content"><p>{page?.final.pre ?? c.final.pre}</p><h2>{page?.final.title ?? c.final.title}</h2><button className="button button--coral" type="button" onClick={() => openBooking()}>{page?.final.action ?? c.final.action} <ArrowRight size={19} /></button></div></section>}

      <footer>
        <div className="shell footer__top">
          <div className="footer__brand"><Logo light language={language} /><p>{c.footer.tagline.split('\n').map((line, index) => <span key={index}>{line}<br /></span>)}</p><a href={`mailto:${encodeURIComponent(t('footer.email', 'merhaba@peremetours.com')).replaceAll('%40', '@')}`}>{t('footer.email', 'merhaba@peremetours.com')}</a></div>
          <div className="footer__links">{c.footer.columns.map(([title, ...links], columnIndex) => <div key={columnIndex}><strong>{title}</strong>{links.map((link, index) => {
            const to = columnIndex === 0
              ? ['/#turlar', categoryPath('bosphorus'), categoryPath('turkish-night'), categoryPath('daytime')][index]
              : columnIndex === 1
                ? ['/#neden-biz', '/#hikayeler', '/sikca-sorulan-sorular', '/iletisim'][index]
                : ['/kvkk-aydinlatma-metni', '/mesafeli-satis-sozlesmesi'][index]
            if (columnIndex === 1 && (index === 0 && hidden('why') || index === 1 && hidden('stories'))) return null
            return <Link key={index} to={to}>{link}</Link>
          })}</div>)}</div>
        </div>
        <div className="shell footer__bottom"><span>{c.footer.copyright}</span><a href={INSTAGRAM_PROFILE_URL} target="_blank" rel="noopener noreferrer"><Camera size={17} /> Instagram</a></div>
      </footer>

      {bookingOpen && selectedTour && <BookingDrawer key={selectedTour.id} tour={selectedTour} language={language} initialDate={date} initialGuests={guests} onClose={() => setBookingOpen(false)} />}
    </main>
  )
}

export default App
