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
  Users,
  Waves,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type Tour = {
  id: number
  category: 'Gün Batımı' | 'Yemekli' | 'Gündüz' | 'Özel Yat'
  badge: string
  title: string
  description: string
  duration: string
  location: string
  rating: number
  reviews: number
  price: number
  oldPrice?: number
  image: string
  imagePosition?: string
  remaining?: number
}

const tours: Tour[] = [
  {
    id: 1,
    category: 'Gün Batımı',
    badge: 'En çok sevilen',
    title: 'Boğaz’da Gün Batımı',
    description: 'Altın saatte, ikramlar ve çok dilli sesli rehber eşliğinde İstanbul.',
    duration: '2 saat',
    location: 'Karaköy kalkışlı',
    rating: 4.9,
    reviews: 328,
    price: 790,
    oldPrice: 940,
    image: '/assets/tour-sunset.webp',
    remaining: 6,
  },
  {
    id: 2,
    category: 'Yemekli',
    badge: 'Geceye özel',
    title: 'Işıklar Altında Akşam',
    description: 'Özel masa, seçkin akşam menüsü ve canlı İstanbul manzarası.',
    duration: '3 saat',
    location: 'Kabataş kalkışlı',
    rating: 4.8,
    reviews: 214,
    price: 1690,
    oldPrice: 1950,
    image: '/assets/tour-dinner.webp',
    remaining: 4,
  },
  {
    id: 3,
    category: 'Özel Yat',
    badge: 'Sana özel',
    title: 'İstanbul Senin Rotan',
    description: '2–8 kişilik özel yat, esnek rota ve kişiselleştirilebilir deneyim.',
    duration: '2–4 saat',
    location: 'Bebek kalkışlı',
    rating: 5,
    reviews: 86,
    price: 7450,
    image: '/assets/tour-private.webp',
  },
  {
    id: 4,
    category: 'Gündüz',
    badge: 'Yeni rota',
    title: 'İki Kıta, Tek Hikâye',
    description: 'Boğaz’ın sarayları, yalıları ve kıyı hikâyeleriyle dolu keşif turu.',
    duration: '1.5 saat',
    location: 'Eminönü kalkışlı',
    rating: 4.7,
    reviews: 142,
    price: 590,
    image: '/assets/hero-bosphorus.webp',
    imagePosition: '38% center',
    remaining: 9,
  },
  {
    id: 5,
    category: 'Yemekli',
    badge: 'Pazar keyfi',
    title: 'Boğaz’da Brunch',
    description: 'Uzun kahvaltı, taze lezzetler ve sakin bir pazar rotası.',
    duration: '2.5 saat',
    location: 'Kuruçeşme kalkışlı',
    rating: 4.9,
    reviews: 67,
    price: 1290,
    image: '/assets/tour-dinner.webp',
    imagePosition: 'left center',
  },
  {
    id: 6,
    category: 'Özel Yat',
    badge: 'Kutlamalara özel',
    title: 'Mavi Saat Kutlaması',
    description: 'Doğum günü ve özel anlar için dekore edilen size özel bir tekne.',
    duration: '3 saat',
    location: 'Arnavutköy kalkışlı',
    rating: 4.9,
    reviews: 103,
    price: 8950,
    image: '/assets/hero-bosphorus.webp',
    imagePosition: 'right center',
    remaining: 2,
  },
]

const categories = ['Tümü', 'Gün Batımı', 'Yemekli', 'Gündüz', 'Özel Yat'] as const

const tomorrow = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().split('T')[0]
}

const today = new Date().toISOString().split('T')[0]

const formatPrice = (price: number) => new Intl.NumberFormat('tr-TR').format(price)

function Logo({ light = false }: { light?: boolean }) {
  return (
    <a href="#top" className={`logo ${light ? 'logo--light' : ''}`} aria-label="PeremeTours ana sayfa">
      <span className="logo__mark" aria-hidden="true">
        <span />
        <span />
      </span>
      <span className="logo__text">
        PEREME<span>TOURS</span>
      </span>
    </a>
  )
}

function App() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [filter, setFilter] = useState<(typeof categories)[number]>('Tümü')
  const [date, setDate] = useState(tomorrow())
  const [guests, setGuests] = useState(2)
  const [experience, setExperience] = useState('Gün Batımı')
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [favorites, setFavorites] = useState<number[]>([])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setBookingOpen(false)
        setMobileMenu(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = bookingOpen || mobileMenu ? 'hidden' : ''
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [bookingOpen, mobileMenu])

  const filteredTours = useMemo(
    () => (filter === 'Tümü' ? tours : tours.filter((tour) => tour.category === filter)),
    [filter],
  )

  const displayedTours = showAll ? filteredTours : filteredTours.slice(0, 3)

  const openBooking = (tour?: Tour) => {
    setSelectedTour(tour ?? tours.find((item) => item.category === experience) ?? tours[0])
    setBookingSuccess(false)
    setBookingOpen(true)
  }

  const findTours = () => {
    setFilter(experience as (typeof categories)[number])
    setShowAll(true)
    document.getElementById('turlar')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main id="top">
      <header className={`site-header ${scrolled ? 'site-header--scrolled' : ''}`}>
        <div className="shell header__inner">
          <Logo light={!scrolled} />
          <nav className="desktop-nav" aria-label="Ana menü">
            <a href="#turlar">Turlar</a>
            <a href="#deneyim">Deneyimler</a>
            <a href="#neden-biz">Neden Pereme?</a>
            <a href="#hikayeler">Hikâyeler</a>
          </nav>
          <div className="header__actions">
            <button className="language" type="button" aria-label="Dil seçimi">
              <Globe2 size={17} /> TR <ChevronDown size={14} />
            </button>
            <button className="nav-cta" type="button" onClick={() => openBooking()}>
              Biletini al <ArrowRight size={16} />
            </button>
            <button
              className="menu-button"
              type="button"
              aria-label="Menüyü aç"
              aria-expanded={mobileMenu}
              onClick={() => setMobileMenu(true)}
            >
              <Menu />
            </button>
          </div>
        </div>
      </header>

      <div className={`mobile-menu ${mobileMenu ? 'mobile-menu--open' : ''}`} aria-hidden={!mobileMenu}>
        <button className="mobile-menu__close" onClick={() => setMobileMenu(false)} aria-label="Menüyü kapat">
          <X />
        </button>
        <Logo light />
        <nav>
          {[
            ['Turlar', '#turlar'],
            ['Deneyimler', '#deneyim'],
            ['Neden Pereme?', '#neden-biz'],
            ['Hikâyeler', '#hikayeler'],
          ].map(([label, href]) => (
            <a key={href} href={href} onClick={() => setMobileMenu(false)}>
              {label} <ArrowRight />
            </a>
          ))}
        </nav>
        <button className="button button--coral" onClick={() => { setMobileMenu(false); openBooking() }}>
          Biletini al <Ticket size={18} />
        </button>
      </div>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__image" />
        <div className="hero__shade" />
        <div className="hero__orb hero__orb--one" />
        <div className="hero__orb hero__orb--two" />
        <div className="shell hero__content">
          <div className="hero__copy">
            <div className="eyebrow eyebrow--light">
              <span className="eyebrow__pulse" /> İstanbul, suyun öteki tarafından
            </div>
            <h1 id="hero-title">
              Şehri izleme.
              <br />
              <em>Onunla ak.</em>
            </h1>
            <p>Boğaz’ın ritmini, gün batımının rengini ve İstanbul’un hiç acele etmeyen halini keşfet.</p>
            <div className="hero__buttons">
              <button className="button button--coral" type="button" onClick={() => openBooking()}>
                Turları keşfet <ArrowRight size={19} />
              </button>
              <a className="play-link" href="#deneyim">
                <span><Play size={15} fill="currentColor" /></span> Deneyimi izle
              </a>
            </div>
          </div>
          <div className="hero__side-note" aria-hidden="true">
            <span>41° 02′ N</span>
            <div />
            <span>29° 00′ E</span>
          </div>
          <a className="scroll-cue" href="#turlar" aria-label="Turlara kaydır">
            <span>Keşfet</span>
            <ArrowDown size={18} />
          </a>
        </div>

        <div className="shell booking-bar-wrap">
          <div className="booking-bar">
            <label className="booking-field">
              <span className="booking-field__icon"><Compass size={21} /></span>
              <span>
                <small>Deneyim</small>
                <select value={experience} onChange={(event) => setExperience(event.target.value)}>
                  <option>Gün Batımı</option>
                  <option>Yemekli</option>
                  <option>Gündüz</option>
                  <option>Özel Yat</option>
                </select>
              </span>
            </label>
            <label className="booking-field">
              <span className="booking-field__icon"><CalendarDays size={21} /></span>
              <span>
                <small>Tarih</small>
                <input type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} />
              </span>
            </label>
            <div className="booking-field booking-field--guests">
              <span className="booking-field__icon"><Users size={21} /></span>
              <span>
                <small>Misafir</small>
                <strong>{guests} kişi</strong>
              </span>
              <div className="stepper" aria-label="Misafir sayısı">
                <button type="button" onClick={() => setGuests(Math.max(1, guests - 1))} aria-label="Misafir azalt"><Minus size={15} /></button>
                <button type="button" onClick={() => setGuests(Math.min(12, guests + 1))} aria-label="Misafir artır"><Plus size={15} /></button>
              </div>
            </div>
            <button className="search-button" type="button" onClick={findTours}>
              <Search size={20} /> <span>Uygun turları bul</span>
            </button>
          </div>
          <div className="availability"><span /> Bu hafta sonu için <strong>son 18 bilet</strong></div>
        </div>
      </section>

      <div className="marquee" aria-label="PeremeTours deneyim özellikleri">
        <div className="marquee__track">
          {[0, 1].map((copy) => (
            <div className="marquee__group" key={copy} aria-hidden={copy === 1}>
              <span>Ücretsiz iptal</span><Sparkles />
              <span>Anında onay</span><Sparkles />
              <span>Yerel rota</span><Sparkles />
              <span>En iyi fiyat</span><Sparkles />
              <span>7/24 destek</span><Sparkles />
            </div>
          ))}
        </div>
      </div>

      <section className="tours-section" id="turlar">
        <div className="shell">
          <div className="section-heading">
            <div>
              <div className="eyebrow"><Waves size={18} /> Rotanı seç</div>
              <h2>Boğaz’da senin <em>anın</em></h2>
            </div>
            <p>İster gün batımında iki saat, ister yalnızca sana ait bir rota. İstanbul’a bakmanın en güzel halini seç.</p>
          </div>
          <div className="filters" role="group" aria-label="Tur kategorileri">
            {categories.map((category) => (
              <button
                key={category}
                className={filter === category ? 'active' : ''}
                type="button"
                onClick={() => { setFilter(category); setShowAll(false) }}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="tour-grid">
            {displayedTours.map((tour, index) => (
              <article className="tour-card" key={tour.id} style={{ '--card-delay': `${index * 80}ms` } as React.CSSProperties}>
                <div className="tour-card__media">
                  <img src={tour.image} alt="" style={{ objectPosition: tour.imagePosition }} />
                  <div className="tour-card__media-shade" />
                  <span className="tour-card__badge">{tour.badge}</span>
                  <button
                    className={`heart-button ${favorites.includes(tour.id) ? 'heart-button--active' : ''}`}
                    type="button"
                    aria-pressed={favorites.includes(tour.id)}
                    aria-label={`${tour.title} turunu ${favorites.includes(tour.id) ? 'favorilerden çıkar' : 'favorilere ekle'}`}
                    onClick={() => setFavorites((items) => items.includes(tour.id) ? items.filter((id) => id !== tour.id) : [...items, tour.id])}
                  >
                    <Heart size={19} fill={favorites.includes(tour.id) ? 'currentColor' : 'none'} />
                  </button>
                  <div className="tour-card__rating"><Star size={14} fill="currentColor" /> {tour.rating} <span>({tour.reviews})</span></div>
                </div>
                <div className="tour-card__body">
                  <span className="tour-card__category">{tour.category}</span>
                  <h3>{tour.title}</h3>
                  <p>{tour.description}</p>
                  <div className="tour-card__meta">
                    <span><Clock3 size={16} /> {tour.duration}</span>
                    <span><MapPin size={16} /> {tour.location}</span>
                  </div>
                  {tour.remaining && <div className="tour-card__spots"><span /> Bu tarih için {tour.remaining} yer kaldı</div>}
                  <div className="tour-card__footer">
                    <div className="price">
                      <small>Kişi başı</small>
                      <span>{formatPrice(tour.price)} ₺</span>
                      {tour.oldPrice && <del>{formatPrice(tour.oldPrice)} ₺</del>}
                    </div>
                    <button type="button" onClick={() => openBooking(tour)} aria-label={`${tour.title} turunu seç`}>
                      Seç <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {filteredTours.length > 3 && (
            <button className="show-more" type="button" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Daha az göster' : `Tüm ${filteredTours.length} turu gör`} <ArrowDown size={17} />
            </button>
          )}
        </div>
      </section>

      <section className="experience" id="deneyim">
        <div className="experience__image" />
        <div className="experience__wash" />
        <div className="shell experience__inner">
          <div className="experience__number">01</div>
          <div className="experience__copy">
            <div className="eyebrow eyebrow--light"><Sparkles size={17} /> Bir turdan fazlası</div>
            <h2>Şehir denizde<br /><em>başka konuşur.</em></h2>
            <p>Kalabalığı kıyıda bırak. İstanbul’un sesini martılardan, ışığını suyun üstünden, hikâyesini yerel anlatıcılardan dinle.</p>
            <div className="experience__features">
              <div><span>01</span><p><strong>Özenli rotalar</strong>Turistik kalabalıktan uzak</p></div>
              <div><span>02</span><p><strong>Gerçek İstanbul</strong>Yerel hikâyeler ve tatlar</p></div>
              <div><span>03</span><p><strong>Küçük gruplar</strong>Daha kişisel bir deneyim</p></div>
            </div>
          </div>
          <div className="experience__stamp" aria-hidden="true">
            <span>PEREME • İSTANBUL • 2026 •</span>
            <Waves />
          </div>
        </div>
      </section>

      <section className="why" id="neden-biz">
        <div className="shell">
          <div className="why__header">
            <div>
              <div className="eyebrow"><ShieldCheck size={18} /> İçin rahat olsun</div>
              <h2>Biletini al.<br /><em>Gerisini akışa bırak.</em></h2>
            </div>
            <div className="why__score">
              <strong>4.9</strong>
              <span><span className="stars">★★★★★</span> 840+ mutlu misafir</span>
            </div>
          </div>
          <div className="benefit-grid">
            <article><span>01</span><ShieldCheck /><h3>Güvenli rezervasyon</h3><p>Şeffaf fiyatlar, anında onay ve güvenli ödeme altyapısı.</p></article>
            <article><span>02</span><CalendarDays /><h3>Planın değişebilir</h3><p>Turdan 24 saat öncesine kadar ücretsiz iptal kolaylığı.</p></article>
            <article><span>03</span><Users /><h3>Yanında bir insan var</h3><p>Rezervasyon öncesi ve sonrası gerçek ekip desteği.</p></article>
            <article><span>04</span><Compass /><h3>Seçilmiş deneyimler</h3><p>Her tekne ve rota Pereme ekibi tarafından yerinde denenir.</p></article>
          </div>
        </div>
      </section>

      <section className="stories" id="hikayeler">
        <div className="shell stories__inner">
          <div className="story-collage" aria-hidden="true">
            <img className="story-collage__main" src="/assets/tour-sunset.webp" alt="" />
            <img className="story-collage__small" src="/assets/tour-private.webp" alt="" />
            <div className="story-collage__note"><span>“</span> İstanbul’a bir de<br />buradan bak.</div>
          </div>
          <div className="testimonial">
            <Quote size={40} />
            <blockquote>“Gün batımı çok güzeldi ama asıl fark, ekibin küçük detayları düşünmesiydi. Kendimizi turist gibi değil, İstanbul’un misafiri gibi hissettik.”</blockquote>
            <div className="testimonial__person">
              <div>EM</div>
              <span><strong>Elif &amp; Mert</strong>Ankara · Gün Batımı Turu</span>
            </div>
            <div className="testimonial__nav">
              <button type="button" aria-label="Önceki yorum"><ArrowRight /></button>
              <span>01 <i /> 03</span>
              <button type="button" aria-label="Sonraki yorum"><ArrowRight /></button>
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="final-cta__image" />
        <div className="shell final-cta__content">
          <p>Sıradaki güzel anın</p>
          <h2>kıyıda beklemiyor.</h2>
          <button className="button button--coral" type="button" onClick={() => openBooking()}>
            Yerini ayır <ArrowRight size={19} />
          </button>
        </div>
      </section>

      <footer>
        <div className="shell footer__top">
          <div className="footer__brand">
            <Logo light />
            <p>İstanbul’un en güzel haline,<br />denizden tanış.</p>
            <a href="mailto:merhaba@peremetours.com">merhaba@peremetours.com</a>
          </div>
          <div className="footer__links">
            <div><strong>Keşfet</strong><a href="#turlar">Tüm turlar</a><a href="#turlar">Gün batımı</a><a href="#turlar">Yemekli turlar</a><a href="#turlar">Özel yat</a></div>
            <div><strong>Pereme</strong><a href="#neden-biz">Hakkımızda</a><a href="#hikayeler">Hikâyeler</a><a href="#top">Sıkça sorulanlar</a><a href="#top">İletişim</a></div>
            <div><strong>Yardım</strong><a href="#top">İptal &amp; iade</a><a href="#top">Gizlilik</a><a href="#top">Mesafeli satış</a><a href="#top">KVKK</a></div>
          </div>
          <div className="newsletter">
            <strong>İstanbul’dan haberin olsun.</strong>
            <p>Yeni rotalar ve sürpriz fiyatlar, ayda en fazla iki kez.</p>
            <form onSubmit={(event) => event.preventDefault()}>
              <input type="email" placeholder="E-posta adresin" aria-label="E-posta adresi" required />
              <button type="submit" aria-label="Bültene kaydol"><ArrowRight /></button>
            </form>
          </div>
        </div>
        <div className="shell footer__bottom">
          <span>© 2026 PeremeTours. Demo tasarım.</span>
          <span>TÜRSAB bilgisi eklenecek</span>
          <a href="#top"><Camera size={17} /> Instagram</a>
        </div>
      </footer>

      <div className={`booking-overlay ${bookingOpen ? 'booking-overlay--open' : ''}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setBookingOpen(false) }}>
        <aside className="booking-drawer" role="dialog" aria-modal="true" aria-labelledby="booking-title">
          <button className="booking-drawer__close" type="button" onClick={() => setBookingOpen(false)} aria-label="Rezervasyonu kapat"><X /></button>
          {bookingSuccess ? (
            <div className="booking-success">
              <div><Check size={34} /></div>
              <span>Talebin hazır</span>
              <h2>Şimdi ödeme altyapısını bekliyoruz.</h2>
              <p>Tasarım demosunda rezervasyon adımların başarıyla çalışıyor. Gerçek bilet ve ödeme entegrasyonu sonraki fazda eklenecek.</p>
              <button className="button button--navy" type="button" onClick={() => setBookingOpen(false)}>Turlara dön</button>
            </div>
          ) : selectedTour && (
            <>
              <div className="booking-drawer__top">
                <span className="eyebrow"><Ticket size={17} /> Rezervasyon özeti</span>
                <h2 id="booking-title">Yerini ayır,<br /><em>anı kaçırma.</em></h2>
              </div>
              <div className="booking-mini-card">
                <img src={selectedTour.image} alt="" />
                <div><span>{selectedTour.category}</span><strong>{selectedTour.title}</strong><small><Clock3 size={14} /> {selectedTour.duration}</small></div>
              </div>
              <div className="drawer-fields">
                <label><span>Tarih</span><input type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} /></label>
                <div className="drawer-guests"><span>Misafir sayısı</span><div><button type="button" aria-label="Misafir azalt" onClick={() => setGuests(Math.max(1, guests - 1))}><Minus /></button><strong>{guests}</strong><button type="button" aria-label="Misafir artır" onClick={() => setGuests(Math.min(12, guests + 1))}><Plus /></button></div></div>
              </div>
              <div className="booking-assurances">
                <span><Check /> Anında onay</span><span><Check /> 24 saate kadar ücretsiz iptal</span>
              </div>
              <div className="booking-total">
                <span>Toplam <small>{guests} misafir için</small></span>
                <strong>{formatPrice(selectedTour.price * guests)} ₺</strong>
              </div>
              <button className="button button--coral booking-submit" type="button" onClick={() => setBookingSuccess(true)}>
                Rezervasyona devam et <ArrowRight />
              </button>
              <small className="demo-note">Bu bir tasarım demosudur, kartından çekim yapılmaz.</small>
            </>
          )}
        </aside>
      </div>
    </main>
  )
}

export default App
