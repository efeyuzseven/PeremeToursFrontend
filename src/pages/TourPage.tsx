import { ArrowLeft, ArrowRight, RefreshCw, Ticket } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { BookingDrawer } from '../components/BookingDrawer'
import { TourPageContent } from '../components/TourPageContent'
import { bookingTour, categoryImages, categoryPath, categorySlugs, resolvePageImage, tourCategories, tourPath, tourTitle,
  type PublicTourItem, type TourLanguage, type TourPageItem } from '../content/tour-pages'
import { ApiError, apiRequest } from '../lib/api'
import { istanbulToday } from '../lib/passengers'
import { parseBookingLink, type BookingLinkSelection } from '../lib/booking-link'
import { setPageMetadata, siteScrollBehavior } from '../lib/site'
import PublicPageLayout from './PublicPageLayout'

const copy = {
  tr: { home: 'Ana sayfa', loading: 'Tur sayfası yükleniyor…', missing: 'Tur bulunamadı', missingText: 'Bu tur artık yayında olmayabilir. Diğer turlarımızı keşfedebilirsin.',
    error: 'Tur bilgileri şu anda alınamıyor.', retry: 'Tekrar dene', empty: 'Bu kategori için şu anda yayında tur bulunmuyor.',
    details: 'Turu incele', booking: 'Rezervasyon yap', all: 'Tüm turları gör', relatedEmpty: 'Bu kategoride şu anda başka bir tur bulunmuyor.', live: 'Güncel sefer, bilet tipi ve fiyatları rezervasyon ekranında görebilirsin.' },
  en: { home: 'Home', loading: 'Loading tour page…', missing: 'Tour not found', missingText: 'This tour may no longer be published. Explore our other tours.',
    error: 'Tour details are currently unavailable.', retry: 'Try again', empty: 'There are currently no published tours in this category.',
    details: 'Explore tour', booking: 'Book now', all: 'View all tours', relatedEmpty: 'There are currently no other tours in this category.', live: 'See current departures, ticket types and prices in the booking screen.' },
}

function TourPageBody({ pageKey, language }: { pageKey: string | null; language: TourLanguage }) {
  const [page, setPage] = useState<TourPageItem | null>(null)
  const [tours, setTours] = useState<PublicTourItem[]>([])
  const [loading, setLoading] = useState(!!pageKey)
  const [catalogLoading, setCatalogLoading] = useState(!!pageKey)
  const [error, setError] = useState<'missing' | 'unavailable' | null>(pageKey ? null : 'missing')
  const [catalogError, setCatalogError] = useState(false)
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState<PublicTourItem | null>(null)
  const [bookingStart, setBookingStart] = useState<{ date: string; guests: number; selection?: BookingLinkSelection }>({ date: istanbulToday(), guests: 1 })
  const [searchParams] = useSearchParams()
  const [bookingLink] = useState(() => parseBookingLink(searchParams))
  const bookingLinkOpened = useRef(false)
  const c = copy[language]
  useEffect(() => {
    const controller = new AbortController()
    window.scrollTo(0, 0)
    if (!pageKey) return () => controller.abort()
    const pageRequest = apiRequest<TourPageItem>(`/api/v1/tour-pages/${pageKey}`, { signal: controller.signal, cache: 'no-store' })
    const toursRequest = apiRequest<PublicTourItem[]>('/api/v1/tours', { signal: controller.signal, cache: 'no-store' })
    pageRequest
      .then(result => { if (!controller.signal.aborted) setPage(result) })
      .catch(caught => { if (!controller.signal.aborted) setError(caught instanceof ApiError && caught.status === 404 ? 'missing' : 'unavailable') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    toursRequest
      .then(result => { if (!controller.signal.aborted) setTours(result) })
      .catch(() => { if (!controller.signal.aborted) setCatalogError(true) })
      .finally(() => { if (!controller.signal.aborted) setCatalogLoading(false) })
    // A booking link (see lib/booking-link) opens this tour's drawer once when the page loads.
    if (bookingLink && !bookingLinkOpened.current) Promise.all([pageRequest, toursRequest]).then(([result, list]) => {
      const tour = result.externalTourId ? list.find(item => item.externalTourId === result.externalTourId) : undefined
      if (controller.signal.aborted || !tour) return
      bookingLinkOpened.current = true
      setBookingStart({ date: bookingLink.date ?? istanbulToday(), guests: 1, selection: bookingLink })
      setSelected(tour)
    }).catch(() => {})
    return () => controller.abort()
  }, [pageKey, reload, bookingLink])
  useEffect(() => {
    const content = page?.document[language]
    setPageMetadata({ title: error === 'missing' ? c.missing : content?.title, description: content?.seoDescription, language, indexable: !loading && !error && !!page })
  }, [page, language, loading, error, c.missing])
  useEffect(() => {
    if (!selected) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', closeOnEscape) }
  }, [selected])
  const retry = () => { setLoading(true); setError(null); setCatalogLoading(true); setCatalogError(false); setReload(value => value + 1) }
  if (loading) return <div className="tour-page-state" role="status"><span className="button-spinner" />{c.loading}</div>
  if (error || !page) return <section className="shell tour-page-state"><h1>{error === 'missing' ? c.missing : c.error}</h1>
    {error === 'missing' ? <p>{c.missingText}</p> : <button type="button" className="tour-page-button" onClick={retry}><RefreshCw size={16} />{c.retry}</button>}
    <Link to="/#turlar"><ArrowLeft size={16} />{c.all}</Link></section>
  const ownTour = tours.find(tour => tour.externalTourId === page.externalTourId)
  const related = tours.filter(tour => tour.categoryKey === page.categoryKey && tour.externalTourId !== page.externalTourId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.externalTourId - b.externalTourId)
  const openTour = (tour: PublicTourItem, date = istanbulToday(), guests = 1) => { setBookingStart({ date, guests }); setSelected(tour) }
  const openBooking = (date?: string, guests?: number) => {
    if (page.externalTourId && ownTour) openTour(ownTour, date, guests)
    else document.getElementById('related-tours')?.scrollIntoView({ behavior: siteScrollBehavior() })
  }
  return <>
    <nav className="shell tour-page-breadcrumb" aria-label={language === 'tr' ? 'Sayfa yolu' : 'Breadcrumb'}>
      <Link to="/">{c.home}</Link><span>/</span>{page.externalTourId && <><Link to={categoryPath(page.categoryKey)}>{language === 'tr' ? 'İlgili turlar' : 'Related tours'}</Link><span>/</span></>}
      <span aria-current="page">{page.document[language].title}</span>
    </nav>
    <TourPageContent page={page} language={language} fallbackImage={ownTour?.imageUrl || tours.find(tour => tour.categoryKey === page.categoryKey)?.imageUrl || undefined}
      onBook={openBooking} bookingDisabled={catalogLoading || catalogError || (page.externalTourId ? !ownTour : related.length === 0)}>
      <section className="tour-page-related" id="related-tours"><div className="shell">
        <div className="tour-page-related__heading"><div><span className="tour-page-eyebrow"><Ticket size={16} />PEREME TOURS</span><h2>{page.document[language].toursHeading}</h2></div><p>{c.live}</p></div>
        {catalogLoading ? <p role="status">{c.loading}</p> : catalogError ? <div className="tour-page-state"><p>{c.error}</p><button className="tour-page-button" type="button" onClick={retry}>{c.retry}</button></div>
          : related.length === 0 ? <p>{page.externalTourId ? c.relatedEmpty : c.empty}</p> : <div className="tour-page-tour-grid">{related.map(tour => <article className="tour-page-tour-card" key={tour.externalTourId}>
            <Link to={tourPath(tour.externalTourId)} aria-label={`${c.details}: ${tourTitle(tour, language)}`}><img src={resolvePageImage(tour.imageUrl || categoryImages[tour.categoryKey])} alt="" loading="lazy" /></Link>
            <div><h3><Link to={tourPath(tour.externalTourId)}>{tourTitle(tour, language)}</Link></h3><p>{(language === 'tr' ? tour.descriptionTr : tour.descriptionEn) || c.live}</p>
              <div className="tour-page-tour-card__actions"><Link to={tourPath(tour.externalTourId)}>{c.details}<ArrowRight size={16} /></Link><button type="button" onClick={() => openTour(tour)}>{c.booking}<Ticket size={16} /></button></div>
            </div>
          </article>)}</div>}
      </div></section>
    </TourPageContent>
    {selected && <BookingDrawer key={selected.externalTourId} tour={bookingTour(selected)} language={language} initialDate={bookingStart.date} initialGuests={bookingStart.guests} initialSelection={bookingStart.selection} onClose={() => setSelected(null)} />}
  </>
}

export default function TourPage() {
  const { categorySlug, tourId } = useParams()
  const category = tourCategories.find(key => categorySlugs[key] === categorySlug)
  const id = tourId && /^[1-9]\d*$/.test(tourId) && Number(tourId) <= 2147483647 ? Number(tourId) : null
  const key = category || (id ? `tour-${id}` : null)
  return <PublicPageLayout>{language => <TourPageBody key={key ?? 'missing'} pageKey={key} language={language} />}</PublicPageLayout>
}
