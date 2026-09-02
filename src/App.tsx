import {
  Anchor,
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
  Navigation,
  Play,
  Plus,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Users,
  Waves,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

type Language = 'tr' | 'en'
type Category = 'sunset' | 'dinner' | 'day' | 'private'
type CategoryFilter = 'all' | Category
type LocalizedText = Record<Language, string>

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
}

const localized = (tr: string, en: string): LocalizedText => ({ tr, en })

const tours: Tour[] = [
  {
    id: 1,
    category: 'sunset',
    badge: localized('En çok sevilen', 'Guest favourite'),
    title: localized('Boğaz’da Gün Batımı', 'Sunset on the Bosphorus'),
    description: localized(
      'Altın saatte, ikramlar ve çok dilli sesli rehber eşliğinde İstanbul.',
      'Istanbul at golden hour with refreshments and a multilingual audio guide.',
    ),
    duration: localized('2 saat', '2 hours'),
    location: localized('Karaköy kalkışlı', 'Departs from Karaköy'),
    rating: 4.9,
    reviews: 328,
    price: 790,
    oldPrice: 940,
    image: '/assets/tour-sunset.webp',
    remaining: 6,
  },
  {
    id: 2,
    category: 'dinner',
    badge: localized('Geceye özel', 'Made for the night'),
    title: localized('Işıklar Altında Akşam', 'Dinner Beneath the Lights'),
    description: localized(
      'Özel masa, seçkin akşam menüsü ve canlı İstanbul manzarası.',
      'A private table, a curated dinner menu and Istanbul glowing outside.',
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
    category: 'private',
    badge: localized('Sana özel', 'Exclusively yours'),
    title: localized('İstanbul Senin Rotan', 'Istanbul, Your Route'),
    description: localized(
      '2–8 kişilik özel yat, esnek rota ve kişiselleştirilebilir deneyim.',
      'A private yacht for 2–8 guests with a flexible, personalised route.',
    ),
    duration: localized('2–4 saat', '2–4 hours'),
    location: localized('Bebek kalkışlı', 'Departs from Bebek'),
    rating: 5,
    reviews: 86,
    price: 7450,
    image: '/assets/tour-private.webp',
  },
  {
    id: 4,
    category: 'day',
    badge: localized('Yeni rota', 'New route'),
    title: localized('İki Kıta, Tek Hikâye', 'Two Continents, One Story'),
    description: localized(
      'Boğaz’ın sarayları, yalıları ve kıyı hikâyeleriyle dolu keşif turu.',
      'A discovery cruise through the palaces, mansions and stories of the strait.',
    ),
    duration: localized('1,5 saat', '1.5 hours'),
    location: localized('Eminönü kalkışlı', 'Departs from Eminönü'),
    rating: 4.7,
    reviews: 142,
    price: 590,
    image: '/assets/hero-bosphorus.webp',
    imagePosition: '38% center',
    remaining: 9,
  },
  {
    id: 5,
    category: 'dinner',
    badge: localized('Pazar keyfi', 'Sunday favourite'),
    title: localized('Boğaz’da Brunch', 'Bosphorus Brunch'),
    description: localized(
      'Uzun kahvaltı, taze lezzetler ve sakin bir pazar rotası.',
      'A leisurely breakfast, fresh flavours and a serene Sunday route.',
    ),
    duration: localized('2,5 saat', '2.5 hours'),
    location: localized('Kuruçeşme kalkışlı', 'Departs from Kuruçeşme'),
    rating: 4.9,
    reviews: 67,
    price: 1290,
    image: '/assets/tour-dinner.webp',
    imagePosition: 'left center',
  },
  {
    id: 6,
    category: 'private',
    badge: localized('Kutlamalara özel', 'For celebrations'),
    title: localized('Mavi Saat Kutlaması', 'Blue Hour Celebration'),
    description: localized(
      'Doğum günü ve özel anlar için dekore edilen size özel bir tekne.',
      'A private boat styled around birthdays and the moments worth celebrating.',
    ),
    duration: localized('3 saat', '3 hours'),
    location: localized('Arnavutköy kalkışlı', 'Departs from Arnavutköy'),
    rating: 4.9,
    reviews: 103,
    price: 8950,
    image: '/assets/hero-bosphorus.webp',
    imagePosition: 'right center',
    remaining: 2,
  },
]

const categoryKeys: CategoryFilter[] = ['all', 'sunset', 'dinner', 'day', 'private']
const experienceKeys: Category[] = ['sunset', 'dinner', 'day', 'private']

const copy = {
  tr: {
    languageName: 'Türkçe',
    nav: [['Turlar', '#turlar'], ['Deneyimler', '#deneyim'], ['Neden Pereme?', '#neden-biz'], ['Hikâyeler', '#hikayeler']],
    a11y: {
      mainNav: 'Ana menü', language: 'Dil seçimi', openMenu: 'Menüyü aç', closeMenu: 'Menüyü kapat', closeBooking: 'Rezervasyonu kapat',
      decrease: 'Misafir azalt', increase: 'Misafir artır', scrollTours: 'Turlara kaydır', tourCategories: 'Tur kategorileri',
      previousReview: 'Önceki yorum', nextReview: 'Sonraki yorum', newsletter: 'Bültene kaydol', email: 'E-posta adresi',
    },
    ticket: 'Biletini al',
    hero: {
      eyebrow: 'İstanbul, suyun öteki tarafından', lead: 'Şehri izleme.', accent: 'Onunla ak.',
      description: 'Boğaz’ın ritmini, gün batımının rengini ve İstanbul’un hiç acele etmeyen halini keşfet.',
      discover: 'Turları keşfet', watch: 'Deneyimi izle', scroll: 'Keşfet', routeLabel: 'Bu akşamki rota',
      routeStops: ['Karaköy', 'Ortaköy', 'Beylerbeyi'], routeMeta: '18:30 · 2 saat', routeLive: 'Canlı',
    },
    booking: {
      experience: 'Deneyim', date: 'Tarih', guest: 'Misafir', guests: (count: number) => `${count} kişi`,
      search: 'Uygun turları bul', availability: 'Bu hafta sonu için', lastTickets: 'son 18 bilet',
    },
    categories: { all: 'Tümü', sunset: 'Gün Batımı', dinner: 'Yemekli', day: 'Gündüz', private: 'Özel Yat' },
    marquee: ['Ücretsiz iptal', 'Anında onay', 'Yerel rota', 'En iyi fiyat', '7/24 destek'],
    tours: {
      eyebrow: 'Rotanı seç', lead: 'Boğaz’da senin', accent: 'anın',
      description: 'İster gün batımında iki saat, ister yalnızca sana ait bir rota. İstanbul’a bakmanın en güzel halini seç.',
      spots: (count: number) => `Bu tarih için ${count} yer kaldı`, perPerson: 'Kişi başı', select: 'Seç',
      favouriteAdd: 'favorilere ekle', favouriteRemove: 'favorilerden çıkar', showLess: 'Daha az göster',
      showAll: (count: number) => `Tüm ${count} turu gör`, watermark: 'BOSPHORUS',
    },
    experience: {
      eyebrow: 'Bir turdan fazlası', lead: 'Şehir denizde', accent: 'başka konuşur.',
      description: 'Kalabalığı kıyıda bırak. İstanbul’un sesini martılardan, ışığını suyun üstünden, hikâyesini yerel anlatıcılardan dinle.',
      features: [['Özenli rotalar', 'Turistik kalabalıktan uzak'], ['Gerçek İstanbul', 'Yerel hikâyeler ve tatlar'], ['Küçük gruplar', 'Daha kişisel bir deneyim']],
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
      note: 'İstanbul’a bir de\nburadan bak.',
      quote: '“Gün batımı çok güzeldi ama asıl fark, ekibin küçük detayları düşünmesiydi. Kendimizi turist gibi değil, İstanbul’un misafiri gibi hissettik.”',
      meta: 'Ankara · Gün Batımı Turu',
    },
    final: { pre: 'Sıradaki güzel anın', title: 'kıyıda beklemiyor.', action: 'Yerini ayır' },
    footer: {
      tagline: 'İstanbul’un en güzel haline,\ndenizden tanış.',
      columns: [
        ['Keşfet', 'Tüm turlar', 'Gün batımı', 'Yemekli turlar', 'Özel yat'],
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
    nav: [['Tours', '#turlar'], ['Experiences', '#deneyim'], ['Why Pereme?', '#neden-biz'], ['Stories', '#hikayeler']],
    a11y: {
      mainNav: 'Main navigation', language: 'Choose language', openMenu: 'Open menu', closeMenu: 'Close menu', closeBooking: 'Close booking',
      decrease: 'Remove guest', increase: 'Add guest', scrollTours: 'Scroll to tours', tourCategories: 'Tour categories',
      previousReview: 'Previous review', nextReview: 'Next review', newsletter: 'Join the newsletter', email: 'Email address',
    },
    ticket: 'Book now',
    hero: {
      eyebrow: 'Istanbul, from the other side of the water', lead: 'Don’t just watch.', accent: 'Flow with it.',
      description: 'Meet the rhythm of the Bosphorus, the colour of sunset and the unhurried side of Istanbul.',
      discover: 'Explore tours', watch: 'Watch the experience', scroll: 'Explore', routeLabel: 'Tonight’s route',
      routeStops: ['Karaköy', 'Ortaköy', 'Beylerbeyi'], routeMeta: '18:30 · 2 hours', routeLive: 'Live',
    },
    booking: {
      experience: 'Experience', date: 'Date', guest: 'Guests', guests: (count: number) => `${count} ${count === 1 ? 'guest' : 'guests'}`,
      search: 'Find available tours', availability: 'For this weekend', lastTickets: 'only 18 tickets left',
    },
    categories: { all: 'All', sunset: 'Sunset', dinner: 'Dinner', day: 'Daytime', private: 'Private Yacht' },
    marquee: ['Free cancellation', 'Instant confirmation', 'Local routes', 'Best price', '24/7 support'],
    tours: {
      eyebrow: 'Choose your route', lead: 'Find your moment', accent: 'on the Bosphorus',
      description: 'Two hours at sunset or a route entirely your own. Choose your favourite way to see Istanbul.',
      spots: (count: number) => `${count} spots left for this date`, perPerson: 'Per person', select: 'Select',
      favouriteAdd: 'add to favourites', favouriteRemove: 'remove from favourites', showLess: 'Show less',
      showAll: (count: number) => `See all ${count} tours`, watermark: 'BOSPHORUS',
    },
    experience: {
      eyebrow: 'More than a tour', lead: 'The city speaks', accent: 'differently at sea.',
      description: 'Leave the crowds ashore. Hear Istanbul through the gulls, see its light on the water and discover its stories with local hosts.',
      features: [['Thoughtful routes', 'Away from the tourist crowds'], ['The real Istanbul', 'Local stories and flavours'], ['Small groups', 'A more personal experience']],
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
      note: 'See Istanbul from\na different side.',
      quote: '“The sunset was beautiful, but the real difference was the team’s attention to every small detail. We felt like guests of Istanbul, not tourists.”',
      meta: 'Ankara · Sunset Cruise',
    },
    final: { pre: 'Your next beautiful moment', title: 'isn’t waiting ashore.', action: 'Save your place' },
    footer: {
      tagline: 'Meet Istanbul at its best,\nfrom the water.',
      columns: [
        ['Explore', 'All tours', 'Sunset', 'Dinner cruises', 'Private yacht'],
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

function Logo({ light = false, language = 'tr' }: { light?: boolean; language?: Language }) {
  return (
    <a href="#top" className={`logo ${light ? 'logo--light' : ''}`} aria-label={language === 'tr' ? 'Dentur Pereme ana sayfa' : 'Dentur Pereme home'}>
      <img src="/assets/pereme-logo.svg" alt="" />
    </a>
  )
}

function App() {
  const [language, setLanguage] = useState<Language>(() => window.localStorage.getItem('pereme-language') === 'en' ? 'en' : 'tr')
  const [languageMenu, setLanguageMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [date, setDate] = useState(tomorrow())
  const [guests, setGuests] = useState(2)
  const [experience, setExperience] = useState<Category>('sunset')
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [favorites, setFavorites] = useState<number[]>([])
  const languagePickerRef = useRef<HTMLDivElement>(null)
  const c = copy[language]

  useEffect(() => {
    document.documentElement.lang = language
    document.title = language === 'tr' ? 'PeremeTours — Boğaz’ın Ritmini Yakala' : 'PeremeTours — Find Your Bosphorus Moment'
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content',
      language === 'tr'
        ? 'PeremeTours ile İstanbul Boğazı’nı gün batımı, yemekli ve özel yat turlarıyla keşfedin.'
        : 'Discover the Istanbul Bosphorus with PeremeTours sunset, dinner and private yacht experiences.',
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

  const filteredTours = useMemo(() => filter === 'all' ? tours : tours.filter((tour) => tour.category === filter), [filter])
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

  return (
    <main id="top">
      <header className={`site-header ${scrolled ? 'site-header--scrolled' : ''}`}>
        <div className="shell header__inner">
          <Logo light={!scrolled} language={language} />
          <nav className="desktop-nav" aria-label={c.a11y.mainNav}>{c.nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
          <div className="header__actions">
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
            <button className="nav-cta" type="button" onClick={() => openBooking()}>{c.ticket} <ArrowRight size={16} /></button>
            <button className="menu-button" type="button" aria-label={c.a11y.openMenu} aria-expanded={mobileMenu} onClick={() => setMobileMenu(true)}><Menu /></button>
          </div>
        </div>
      </header>

      <div className={`mobile-menu ${mobileMenu ? 'mobile-menu--open' : ''}`} aria-hidden={!mobileMenu}>
        <button className="mobile-menu__close" onClick={() => setMobileMenu(false)} aria-label={c.a11y.closeMenu}><X /></button>
        <Logo light language={language} />
        <nav>{c.nav.map(([label, href]) => <a key={href} href={href} onClick={() => setMobileMenu(false)}>{label} <ArrowRight /></a>)}</nav>
        <div className="mobile-languages" aria-label={c.a11y.language}>
          {(['tr', 'en'] as Language[]).map((item) => <button key={item} className={language === item ? 'active' : ''} type="button" onClick={() => changeLanguage(item)}>{item.toUpperCase()} <span>{copy[item].languageName}</span></button>)}
        </div>
        <button className="button button--coral" onClick={() => { setMobileMenu(false); openBooking() }}>{c.ticket} <Ticket size={18} /></button>
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
            <h1 id="hero-title">{c.hero.lead}<br /><em>{c.hero.accent}</em></h1>
            <p>{c.hero.description}</p>
            <div className="hero__buttons">
              <button className="button button--coral" type="button" onClick={() => openBooking()}>{c.hero.discover} <ArrowRight size={19} /></button>
              <a className="play-link" href="#deneyim"><span><Play size={15} fill="currentColor" /></span> {c.hero.watch}</a>
            </div>
          </div>
          <div className="hero__route-card">
            <div className="route-card__top"><span><Navigation size={14} /> {c.hero.routeLabel}</span><i>{c.hero.routeLive}</i></div>
            <div className="route-card__stops">{c.hero.routeStops.map((stop, index) => <span key={stop}><b>{index + 1}</b>{stop}</span>)}</div>
            <div className="route-card__bottom"><Anchor size={16} /> {c.hero.routeMeta}</div>
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
          <div className="availability"><span /> {c.booking.availability} <strong>{c.booking.lastTickets}</strong></div>
        </div>
      </section>

      <div className="marquee" aria-label="PeremeTours">
        <div className="marquee__track">{[0, 1].map((item) => <div className="marquee__group" key={item} aria-hidden={item === 1}>{c.marquee.map((label) => <span className="marquee__item" key={label}><span>{label}</span><Sparkles /></span>)}</div>)}</div>
      </div>

      <section className="tours-section" id="turlar">
        <span className="section-watermark" aria-hidden="true">{c.tours.watermark}</span>
        <div className="shell">
          <div className="section-heading"><div><div className="eyebrow"><Waves size={18} /> {c.tours.eyebrow}</div><h2>{c.tours.lead} <em>{c.tours.accent}</em></h2></div><p>{c.tours.description}</p></div>
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
                  {tour.remaining && <div className="tour-card__spots"><span /> {c.tours.spots(tour.remaining)}</div>}
                  <div className="tour-card__footer"><div className="price"><small>{c.tours.perPerson}</small><span>{formatPrice(tour.price)} ₺</span>{tour.oldPrice && <del>{formatPrice(tour.oldPrice)} ₺</del>}</div><button type="button" onClick={() => openBooking(tour)} aria-label={`${tour.title[language]} ${c.tours.select}`}>{c.tours.select} <ArrowRight size={18} /></button></div>
                </div>
              </article>
            ))}
          </div>
          {filteredTours.length > 3 && <button className="show-more" type="button" onClick={() => setShowAll(!showAll)}>{showAll ? c.tours.showLess : c.tours.showAll(filteredTours.length)} <ArrowDown size={17} /></button>}
        </div>
      </section>

      <section className="experience" id="deneyim">
        <div className="experience__image" /><div className="experience__wash" /><div className="experience__glow" aria-hidden="true" />
        <div className="shell experience__inner">
          <div className="experience__number">01</div>
          <div className="experience__copy">
            <div className="eyebrow eyebrow--light"><Sparkles size={17} /> {c.experience.eyebrow}</div><h2>{c.experience.lead}<br /><em>{c.experience.accent}</em></h2><p>{c.experience.description}</p>
            <div className="experience__features">{c.experience.features.map(([title, text], index) => <div key={title}><span>0{index + 1}</span><p><strong>{title}</strong>{text}</p></div>)}</div>
          </div>
          <div className="experience__stamp" aria-hidden="true"><span>PEREME • ISTANBUL • 2026 •</span><Waves /></div>
        </div>
      </section>

      <section className="why" id="neden-biz">
        <div className="shell">
          <div className="why__header"><div><div className="eyebrow"><ShieldCheck size={18} /> {c.why.eyebrow}</div><h2>{c.why.lead}<br /><em>{c.why.accent}</em></h2></div><div className="why__score"><strong>4.9</strong><span><span className="stars">★★★★★</span> {c.why.reviews}</span></div></div>
          <div className="benefit-grid">{c.why.benefits.map(([title, text], index) => { const Icon = [ShieldCheck, CalendarDays, Users, Compass][index]; return <article key={title}><span>0{index + 1}</span><Icon /><h3>{title}</h3><p>{text}</p></article> })}</div>
        </div>
      </section>

      <section className="stories" id="hikayeler">
        <div className="shell stories__inner">
          <div className="story-collage" aria-hidden="true"><img className="story-collage__main" src="/assets/tour-sunset.webp" alt="" /><img className="story-collage__small" src="/assets/tour-private.webp" alt="" /><div className="story-collage__note"><span>“</span>{c.story.note.split('\n').map((line) => <span className="story-note__line" key={line}>{line}</span>)}</div></div>
          <div className="testimonial"><Quote size={40} /><blockquote>{c.story.quote}</blockquote><div className="testimonial__person"><div>EM</div><span><strong>Elif &amp; Mert</strong>{c.story.meta}</span></div><div className="testimonial__nav"><button type="button" aria-label={c.a11y.previousReview}><ArrowRight /></button><span>01 <i /> 03</span><button type="button" aria-label={c.a11y.nextReview}><ArrowRight /></button></div></div>
        </div>
      </section>

      <section className="final-cta"><div className="final-cta__image" /><div className="final-cta__rings" aria-hidden="true"><span /><span /><span /></div><div className="shell final-cta__content"><p>{c.final.pre}</p><h2>{c.final.title}</h2><button className="button button--coral" type="button" onClick={() => openBooking()}>{c.final.action} <ArrowRight size={19} /></button></div></section>

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
