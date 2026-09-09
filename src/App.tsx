import {
  ArrowDown,
  ArrowRight,
  Camera,
  CalendarDays,
  Check,
  ChevronDown,
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
  Sparkles,
  Star,
  Ticket,
  UserRound,
  Users,
  Waves,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import type { HomepageContentDocument } from './content/homepage'
import { apiBaseUrl, apiRequest } from './lib/api'

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
  price: number
  oldPrice?: number
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
    price: 590,
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
    price: 1690,
    oldPrice: 1950,
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
    price: 790,
    oldPrice: 940,
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
    price: 590,
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
    nav: [['Turlar', '#turlar'], ['Hizmetlerimiz', '#hizmetler'], ['Neden Pereme?', '#neden-biz'], ['Hikâyeler', '#hikayeler']],
    a11y: {
      mainNav: 'Ana menü', language: 'Dil seçimi', openMenu: 'Menüyü aç', closeMenu: 'Menüyü kapat', closeBooking: 'Rezervasyonu kapat',
      decrease: 'Misafir azalt', increase: 'Misafir artır', scrollTours: 'Turlara kaydır', tourCategories: 'Tur kategorileri',
      previousReview: 'Önceki yorum', nextReview: 'Sonraki yorum', newsletter: 'Bültene kaydol', email: 'E-posta adresi',
    },
    hero: {
      eyebrow: 'İstanbul, suyun öteki tarafından', lead: 'Şehri izleme.', accent: 'Onunla ak.',
      description: 'Boğaz’ın ritmini, gün batımının rengini ve İstanbul’un hiç acele etmeyen halini keşfet.',
      watch: 'Hizmetlerimizi incele', scroll: 'Keşfet', cardLabel: 'İstanbul Boğazı’nda',
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
      eyebrow: 'Rotanı seç', lead: 'Boğaz’da senin', accent: 'anın',
      description: 'Boğaz Turu, Türk Gecesi, Sunset veya DayTime. İstanbul’a bakmanın en güzel halini seç.',
      spots: (count: number) => `Bu tarih için ${count} yer kaldı`, perPerson: 'Kişi başı', select: 'Rezervasyon Yap',
      favouriteAdd: 'favorilere ekle', favouriteRemove: 'favorilerden çıkar', showLess: 'Daha az göster',
      showAll: (count: number) => `Tüm ${count} turu gör`, watermark: 'BOSPHORUS',
    },
    experience: {
      eyebrow: 'Bir turdan fazlası', lead: 'Şehir denizde', accent: 'başka konuşur.',
      description: 'Kalabalığı kıyıda bırak. İstanbul’un sesini martılardan, ışığını suyun üstünden, hikâyesini yerel anlatıcılardan dinle.',
      features: [['Özenli rotalar', 'Turistik kalabalıktan uzak'], ['Gerçek İstanbul', 'Yerel hikâyeler ve tatlar'], ['Küçük gruplar', 'Daha kişisel bir deneyim']],
    },
    services: {
      eyebrow: 'Hizmetlerimiz', lead: 'İstanbul’u kendi', accent: 'ritminde yaşa.',
      description: 'Geceden gün batımına, gündüz rotalarından klasik Boğaz turlarına uzanan deneyimini seç.',
      items: [
        ['turkish-night', 'Türk Gecesi', 'Akşam yemeği, canlı gösteriler ve Boğaz’ın gece ışıkları.', 'İlgili turları gör', 'Rezervasyon yap'],
        ['sunset', 'Sunset', 'İstanbul siluetini altın saatin renkleriyle denizden izle.', 'İlgili turları gör', 'Rezervasyon yap'],
        ['daytime', 'DayTime', 'Gün ışığında iki yaka, yalılar ve şehrin kıyı hikâyeleri.', 'İlgili turları gör', 'Rezervasyon yap'],
        ['bosphorus', 'Boğaz Turu', 'İstanbul’un simge yapılarını denizden keşfeden klasik rota.', 'İlgili turları gör', 'Rezervasyon yap'],
      ] as [Category, string, string, string, string][],
    },
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
      description: 'PeremeTours Instagram hesabındaki güncel videoları ve misafir anlarını keşfet.',
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
        ['Yardım', 'İptal & iade', 'Gizlilik', 'Mesafeli satış', 'KVKK'],
      ],
      newsletterTitle: 'İstanbul’dan haberin olsun.', newsletterText: 'Yeni rotalar ve sürpriz fiyatlar, ayda en fazla iki kez.',
      emailPlaceholder: 'E-posta adresin', copyright: '© 2026 PeremeTours. Demo tasarım.', agency: 'TÜRSAB bilgisi eklenecek',
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
    nav: [['Tours', '#turlar'], ['Our Services', '#hizmetler'], ['Why Pereme?', '#neden-biz'], ['Stories', '#hikayeler']],
    a11y: {
      mainNav: 'Main navigation', language: 'Choose language', openMenu: 'Open menu', closeMenu: 'Close menu', closeBooking: 'Close booking',
      decrease: 'Remove guest', increase: 'Add guest', scrollTours: 'Scroll to tours', tourCategories: 'Tour categories',
      previousReview: 'Previous review', nextReview: 'Next review', newsletter: 'Join the newsletter', email: 'Email address',
    },
    hero: {
      eyebrow: 'Istanbul, from the other side of the water', lead: 'Don’t just watch.', accent: 'Flow with it.',
      description: 'Meet the rhythm of the Bosphorus, the colour of sunset and the unhurried side of Istanbul.',
      watch: 'Explore our services', scroll: 'Explore', cardLabel: 'On the Bosphorus',
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
      eyebrow: 'Choose your route', lead: 'Find your moment', accent: 'on the Bosphorus',
      description: 'Bosphorus Cruise, Turkish Night, Sunset or Daytime. Choose your favourite way to see Istanbul.',
      spots: (count: number) => `${count} spots left for this date`, perPerson: 'Per person', select: 'Book now',
      favouriteAdd: 'add to favourites', favouriteRemove: 'remove from favourites', showLess: 'Show less',
      showAll: (count: number) => `See all ${count} tours`, watermark: 'BOSPHORUS',
    },
    experience: {
      eyebrow: 'More than a tour', lead: 'The city speaks', accent: 'differently at sea.',
      description: 'Leave the crowds ashore. Hear Istanbul through the gulls, see its light on the water and discover its stories with local hosts.',
      features: [['Thoughtful routes', 'Away from the tourist crowds'], ['The real Istanbul', 'Local stories and flavours'], ['Small groups', 'A more personal experience']],
    },
    services: {
      eyebrow: 'Our services', lead: 'Experience Istanbul', accent: 'at your own pace.',
      description: 'Choose your experience from dinner shows and sunsets to daytime routes and classic Bosphorus cruises.',
      items: [
        ['turkish-night', 'Turkish Night', 'Dinner, live performances and the night lights of the Bosphorus.', 'View related tours', 'Book now'],
        ['sunset', 'Sunset', 'Watch Istanbul’s skyline from the water during golden hour.', 'View related tours', 'Book now'],
        ['daytime', 'DayTime', 'Two shores, waterfront mansions and local stories in daylight.', 'View related tours', 'Book now'],
        ['bosphorus', 'Bosphorus Cruise', 'A classic route past Istanbul’s landmarks and waterfront history.', 'View related tours', 'Book now'],
      ] as [Category, string, string, string, string][],
    },
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
      description: 'Discover recent videos and guest moments from the PeremeTours Instagram account.',
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
        ['Support', 'Cancellation & refunds', 'Privacy', 'Distance sales', 'Data protection'],
      ],
      newsletterTitle: 'Stay close to Istanbul.', newsletterText: 'New routes and surprise fares, no more than twice a month.',
      emailPlaceholder: 'Your email address', copyright: '© 2026 PeremeTours. Design demo.', agency: 'TÜRSAB details to be added',
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

const tomorrow = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().split('T')[0]
}

const today = new Date().toISOString().split('T')[0]

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
  const [date, setDate] = useState(tomorrow())
  const [guests, setGuests] = useState(2)
  const [experience, setExperience] = useState<Category>('turkish-night')
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [favorites, setFavorites] = useState<number[]>([])
  const languagePickerRef = useRef<HTMLDivElement>(null)
  const c = copy[language]
  const page = homepageContent?.[language]

  useEffect(() => {
    const controller = new AbortController()
    apiRequest<CatalogTour[]>('/api/v1/tours', { signal: controller.signal })
      .then((catalog) => setTours(mergeCatalogTours(catalog)))
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    apiRequest<HomepageContentDocument>('/api/v1/site-content/homepage', { signal: controller.signal })
      .then(setHomepageContent)
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    document.title = language === 'tr' ? 'PeremeTours — Boğaz’ın Ritmini Yakala' : 'PeremeTours — Find Your Bosphorus Moment'
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content',
      language === 'tr'
        ? 'PeremeTours ile Boğaz Turu, Türk Gecesi Dinner Cruise, Sunset ve DayTime deneyimlerini keşfedin.'
        : 'Discover Bosphorus Cruise, Turkish Night Dinner Cruise, Sunset and Daytime experiences with PeremeTours.',
    )
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
  const displayedTours = showAll ? filteredTours : filteredTours.slice(0, 3)
  const formatPrice = (price: number) => new Intl.NumberFormat(language === 'tr' ? 'tr-TR' : 'en-US').format(price)

  const changeLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage)
    setLanguageMenu(false)
  }

  const openBooking = (tour?: Tour) => {
    setSelectedTour(tour ?? tours.find((item) => item.category === experience) ?? tours[0])
    setBookingSuccess(false)
    setBookingOpen(true)
  }

  const findTours = () => {
    setFilter(experience)
    setShowAll(true)
    document.getElementById('turlar')?.scrollIntoView({ behavior: 'smooth' })
  }

  const showCategoryTours = (category: Category) => {
    setFilter(category)
    setShowAll(true)
    requestAnimationFrame(() => document.getElementById('turlar')?.scrollIntoView({ behavior: 'smooth' }))
  }

  const serviceItems = page?.services.items
    ?? c.services.items.map(([categoryKey, title, description, browseLabel, bookingLabel]) => ({ categoryKey, title, description, browseLabel, bookingLabel }))
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
            <Link className="account-link" to={user?.role === 'Admin' ? '/admin/tickets' : '/login'}>
              <UserRound size={16} /> <span>{user?.role === 'Admin' ? (language === 'tr' ? 'Panel' : 'Admin') : (language === 'tr' ? 'Hesabım' : 'My account')}</span>
            </Link>
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
        <nav>{c.nav.map(([label, href]) => <a key={href} href={href} onClick={() => setMobileMenu(false)}>{label} <ArrowRight /></a>)}<Link to={user?.role === 'Admin' ? '/admin/tickets' : '/login'} onClick={() => setMobileMenu(false)}>{user?.role === 'Admin' ? (language === 'tr' ? 'Yönetim paneli' : 'Admin panel') : (language === 'tr' ? 'Hesabım' : 'My account')} <UserRound /></Link></nav>
        <div className="mobile-languages" aria-label={c.a11y.language}>
          {(['tr', 'en'] as Language[]).map((item) => <button key={item} className={language === item ? 'active' : ''} type="button" onClick={() => changeLanguage(item)}>{item.toUpperCase()} <span>{copy[item].languageName}</span></button>)}
        </div>
      </div>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__image" /><div className="hero__shade" /><div className="hero__orb hero__orb--one" /><div className="hero__orb hero__orb--two" />
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
              <a className="play-link" href="#hizmetler"><span><Play size={15} fill="currentColor" /></span> {c.hero.watch}</a>
            </div>
          </div>
          <div className="hero__experience-card">
            <div className="experience-card__top"><span><Waves size={15} /> {c.hero.cardLabel}</span><i>{c.hero.cardCount}</i></div>
            <p className="experience-card__lead">{c.hero.cardLead}<br /><em>{c.hero.cardAccent}</em></p>
            <div className="experience-card__types">{c.hero.cardTypes.map((type, index) => <span key={type}><b>0{index + 1}</b>{type}</span>)}</div>
            <div className="experience-card__note"><Sparkles size={14} /> {c.hero.cardNote}</div>
          </div>
          <div className="hero__side-note" aria-hidden="true"><span>41° 02′ N</span><div /><span>29° 00′ E</span></div>
          <a className="scroll-cue" href="#turlar" aria-label={c.a11y.scrollTours}><span>{c.hero.scroll}</span><ArrowDown size={18} /></a>
        </div>

        <div className="shell booking-bar-wrap">
          <div className="booking-bar">
            <label className="booking-field">
              <span className="booking-field__icon"><Compass size={21} /></span>
              <span><small>{c.booking.experience}</small><select value={experience} onChange={(event) => setExperience(event.target.value as Category)}>{experienceKeys.map((category) => <option key={category} value={category}>{c.categories[category]}</option>)}</select></span>
            </label>
            <label className="booking-field"><span className="booking-field__icon"><CalendarDays size={21} /></span><span><small>{c.booking.date}</small><input type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} /></span></label>
            <div className="booking-field booking-field--guests">
              <span className="booking-field__icon"><Users size={21} /></span><span><small>{c.booking.guest}</small><strong>{c.booking.guests(guests)}</strong></span>
              <div className="stepper" aria-label={c.drawer.guestCount}><button type="button" onClick={() => setGuests(Math.max(1, guests - 1))} aria-label={c.a11y.decrease}><Minus size={15} /></button><button type="button" onClick={() => setGuests(Math.min(12, guests + 1))} aria-label={c.a11y.increase}><Plus size={15} /></button></div>
            </div>
            <button className="search-button" type="button" onClick={findTours}><Search size={20} /> <span>{c.booking.search}</span></button>
          </div>
        </div>
      </section>

      <div className="marquee" aria-label="PeremeTours">
        <div className="marquee__track">{[0, 1].map((item) => <div className="marquee__group" key={item} aria-hidden={item === 1}>{c.marquee.map((label) => <span className="marquee__item" key={label}><span>{label}</span><Sparkles /></span>)}</div>)}</div>
      </div>

      <section className="tours-section" id="turlar">
        <span className="section-watermark" aria-hidden="true">{c.tours.watermark}</span>
        <div className="shell">
          <div className="section-heading"><div><div className="eyebrow"><Waves size={18} /> {page?.tours.eyebrow ?? c.tours.eyebrow}</div><h2>{page?.tours.lead ?? c.tours.lead} <em>{page?.tours.accent ?? c.tours.accent}</em></h2></div><p>{page?.tours.description ?? c.tours.description}</p></div>
          <div className="filters" role="group" aria-label={c.a11y.tourCategories}>{categoryKeys.map((category) => <button key={category} className={filter === category ? 'active' : ''} type="button" onClick={() => { setFilter(category); setShowAll(false) }}>{c.categories[category]}</button>)}</div>
          <div className="tour-grid">
            {displayedTours.map((tour, index) => (
              <article className="tour-card" key={tour.id} style={{ '--card-delay': `${index * 80}ms` } as CSSProperties}>
                <div className="tour-card__media">
                  <img src={tour.image} alt="" style={{ objectPosition: tour.imagePosition }} /><div className="tour-card__media-shade" /><span className="tour-card__badge">{tour.badge[language]}</span>
                  <button className={`heart-button ${favorites.includes(tour.id) ? 'heart-button--active' : ''}`} type="button" aria-pressed={favorites.includes(tour.id)} aria-label={`${tour.title[language]} ${favorites.includes(tour.id) ? c.tours.favouriteRemove : c.tours.favouriteAdd}`} onClick={() => setFavorites((items) => items.includes(tour.id) ? items.filter((id) => id !== tour.id) : [...items, tour.id])}><Heart size={19} fill={favorites.includes(tour.id) ? 'currentColor' : 'none'} /></button>
                  <div className="tour-card__rating"><Star size={14} fill="currentColor" /> {tour.rating} <span>({tour.reviews})</span></div>
                </div>
                <div className="tour-card__body">
                  <span className="tour-card__category">{c.categories[tour.category]}</span><h3>{tour.title[language]}</h3><p>{tour.description[language]}</p>
                  <div className="tour-card__meta"><span><Clock3 size={16} /> {tour.duration[language]}</span><span><MapPin size={16} /> {tour.location[language]}</span></div>
                  <div className="tour-card__footer"><div className="price"><small>{c.tours.perPerson}</small><span>{formatPrice(tour.price)} ₺</span>{tour.oldPrice && <del>{formatPrice(tour.oldPrice)} ₺</del>}</div><button type="button" onClick={() => openBooking(tour)} aria-label={`${tour.title[language]} ${c.tours.select}`}>{c.tours.select} <ArrowRight size={18} /></button></div>
                </div>
              </article>
            ))}
          </div>
          {filteredTours.length > 3 && <button className="show-more" type="button" onClick={() => setShowAll(!showAll)}>{showAll ? c.tours.showLess : c.tours.showAll(filteredTours.length)} <ArrowDown size={17} /></button>}
        </div>
      </section>

      <section className="services" id="hizmetler">
        <div className="shell">
          <div className="section-heading section-heading--light"><div><div className="eyebrow eyebrow--light"><Sparkles size={17} /> {page?.services.eyebrow ?? c.services.eyebrow}</div><h2>{page?.services.lead ?? c.services.lead}<br /><em>{page?.services.accent ?? c.services.accent}</em></h2></div><p>{page?.services.description ?? c.services.description}</p></div>
          <div className="service-grid">
            {serviceItems.map((item, index) => {
              const relatedTour = tours.find((tour) => tour.category === item.categoryKey)
              return <article className="service-card" key={item.categoryKey}>
                <div className="service-card__image"><img src={relatedTour?.image ?? fallbackTours.find((tour) => tour.category === item.categoryKey)?.image} alt="" /><span>0{index + 1}</span></div>
                <div className="service-card__body"><small>{c.categories[item.categoryKey]}</small><h3>{item.title}</h3><p>{item.description}</p><div><button type="button" onClick={() => showCategoryTours(item.categoryKey)}>{item.browseLabel} <ArrowRight /></button><button type="button" disabled={!relatedTour} onClick={() => openBooking(relatedTour)}>{item.bookingLabel} <Ticket /></button></div></div>
              </article>
            })}
          </div>
        </div>
      </section>

      <section className="why" id="neden-biz">
        <div className="shell">
          <div className="why__header"><div><div className="eyebrow"><ShieldCheck size={18} /> {page?.why.eyebrow ?? c.why.eyebrow}</div><h2>{page?.why.lead ?? c.why.lead}<br /><em>{page?.why.accent ?? c.why.accent}</em></h2></div><div className="why__score"><strong>4.9</strong><span><span className="stars">★★★★★</span> {page?.why.reviews ?? c.why.reviews}</span></div></div>
          <div className="benefit-grid">{benefits.map(({ title, description }, index) => { const Icon = [ShieldCheck, CalendarDays, Users, Compass][index]; return <article key={`${title}-${index}`}><span>0{index + 1}</span><Icon /><h3>{title}</h3><p>{description}</p></article> })}</div>
        </div>
      </section>

      <section className="stories" id="hikayeler">
        <div className="shell"><div className="stories__heading"><div className="eyebrow"><Camera size={17} /> {page?.stories.eyebrow ?? c.story.eyebrow}</div><h2>{page?.stories.lead ?? c.story.lead} <em>{page?.stories.accent ?? c.story.accent}</em></h2><p>{page?.stories.description ?? c.story.description}</p></div>
          {instagramUrls.length > 0 ? <div className="instagram-grid">{instagramUrls.map((url) => { const embedUrl = instagramEmbedUrl(url); return embedUrl && <iframe key={url} src={embedUrl} title="PeremeTours Instagram" loading="lazy" allowFullScreen /> })}</div> : <div className="stories__inner stories__inner--fallback">
            <div className="story-collage" aria-hidden="true"><img className="story-collage__main" src="/assets/tour-sunset.webp" alt="" /><img className="story-collage__small" src="/assets/tour-private.webp" alt="" /><div className="story-collage__note"><span>“</span>{c.story.note.split('\n').map((line) => <span className="story-note__line" key={line}>{line}</span>)}</div></div>
            <div className="testimonial"><Quote size={40} /><blockquote>{page?.stories.quote ?? c.story.quote}</blockquote><div className="testimonial__person"><div>EM</div><span><strong>Elif &amp; Mert</strong>{page?.stories.meta ?? c.story.meta}</span></div></div>
          </div>}
        </div>
      </section>

      <section className="final-cta"><div className="final-cta__image" /><div className="final-cta__rings" aria-hidden="true"><span /><span /><span /></div><div className="shell final-cta__content"><p>{page?.final.pre ?? c.final.pre}</p><h2>{page?.final.title ?? c.final.title}</h2><button className="button button--coral" type="button" onClick={() => openBooking()}>{page?.final.action ?? c.final.action} <ArrowRight size={19} /></button></div></section>

      <footer>
        <div className="shell footer__top">
          <div className="footer__brand"><Logo light language={language} /><p>{c.footer.tagline.split('\n').map((line) => <span key={line}>{line}<br /></span>)}</p><a href="mailto:merhaba@peremetours.com">merhaba@peremetours.com</a></div>
          <div className="footer__links">{c.footer.columns.map(([title, ...links], columnIndex) => <div key={title}><strong>{title}</strong>{links.map((link, index) => <a key={link} href={columnIndex === 0 ? '#turlar' : index === 1 ? '#hikayeler' : '#top'}>{link}</a>)}</div>)}</div>
          <div className="newsletter"><strong>{c.footer.newsletterTitle}</strong><p>{c.footer.newsletterText}</p><form onSubmit={(event) => event.preventDefault()}><input type="email" placeholder={c.footer.emailPlaceholder} aria-label={c.a11y.email} required /><button type="submit" aria-label={c.a11y.newsletter}><ArrowRight /></button></form></div>
        </div>
        <div className="shell footer__bottom"><span>{c.footer.copyright}</span><span>{c.footer.agency}</span><a href="#top"><Camera size={17} /> Instagram</a></div>
      </footer>

      <div className={`booking-overlay ${bookingOpen ? 'booking-overlay--open' : ''}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setBookingOpen(false) }}>
        <aside className="booking-drawer" role="dialog" aria-modal="true" aria-labelledby="booking-title">
          <button className="booking-drawer__close" type="button" onClick={() => setBookingOpen(false)} aria-label={c.a11y.closeBooking}><X /></button>
          {bookingSuccess ? (
            <div className="booking-success"><div><Check size={34} /></div><span>{c.drawer.successLabel}</span><h2>{c.drawer.successTitle}</h2><p>{c.drawer.successText}</p><button className="button button--navy" type="button" onClick={() => setBookingOpen(false)}>{c.drawer.back}</button></div>
          ) : selectedTour && (
            <>
              <div className="booking-drawer__top"><span className="eyebrow"><Ticket size={17} /> {c.drawer.summary}</span><h2 id="booking-title">{c.drawer.lead}<br /><em>{c.drawer.accent}</em></h2></div>
              <div className="booking-mini-card"><img src={selectedTour.image} alt="" /><div><span>{c.categories[selectedTour.category]}</span><strong>{selectedTour.title[language]}</strong><small><Clock3 size={14} /> {selectedTour.duration[language]}</small></div></div>
              <div className="drawer-fields"><label><span>{c.booking.date}</span><input type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} /></label><div className="drawer-guests"><span>{c.drawer.guestCount}</span><div><button type="button" aria-label={c.a11y.decrease} onClick={() => setGuests(Math.max(1, guests - 1))}><Minus /></button><strong>{guests}</strong><button type="button" aria-label={c.a11y.increase} onClick={() => setGuests(Math.min(12, guests + 1))}><Plus /></button></div></div></div>
              <div className="booking-assurances"><span><Check /> {c.drawer.instant}</span><span><Check /> {c.drawer.cancellation}</span></div>
              <div className="booking-total"><span>{c.drawer.total}<small>{c.drawer.forGuests(guests)}</small></span><strong>{formatPrice(selectedTour.price * guests)} ₺</strong></div>
              <button className="button button--coral booking-submit" type="button" onClick={() => setBookingSuccess(true)}>{c.drawer.continue} <ArrowRight /></button><small className="demo-note">{c.drawer.demo}</small>
            </>
          )}
        </aside>
      </div>
    </main>
  )
}

export default App
