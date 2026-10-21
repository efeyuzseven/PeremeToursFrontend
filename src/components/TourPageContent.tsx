import DOMPurify from 'dompurify'
import { ArrowRight, Check, MapPin, Waves, X } from 'lucide-react'
import { lazy, Suspense, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { bookingNotesFor, categoryImages, isGoogleMapEmbed, isHtmlDetails, mapSlots, parseTourDetails, pointName, pointNote, resolvePageImage, tourDetailsFor,
  type TourDetailRow, type TourLanguage, type TourPageItem, type TourPageSection } from '../content/tour-pages'
import '../pages/tour-pages.css'
import { TourBookingCard } from './TourBookingCard'
import { TourGallery } from './TourGallery'

const copy = {
  tr: { more: 'Daha fazlasını gör', less: 'Daha az göster' },
  en: { more: 'See more', less: 'See less' },
}

// Links that open a new tab must not get access to this page.
DOMPurify.addHook('afterSanitizeAttributes', node => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') node.setAttribute('rel', 'noopener noreferrer')
})

// Admin-written HTML is sanitized before rendering: no scripts, event handlers, forms, frames or page-wide <style> blocks.
function TourHtml({ html }: { html: string }) {
  const clean = useMemo(() => DOMPurify.sanitize(html, {
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe', 'object', 'embed'], ADD_ATTR: ['target'],
  }), [html])
  return <div className="tour-html" dangerouslySetInnerHTML={{ __html: clean }} />
}

// Matches .tour-detail-collapsible.is-collapsed max-height in tour-pages.css.
const COLLAPSED_HEIGHT = 440

// One "See more" per row, shown only when the content is actually taller than the collapsed height.
function Collapsible({ language, children }: { language: TourLanguage; children: ReactNode }) {
  const content = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  useLayoutEffect(() => {
    const element = content.current
    if (!element) return
    const measure = () => setOverflowing(element.scrollHeight > COLLAPSED_HEIGHT + 8)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return <>
    <div ref={content} className={`tour-detail-collapsible${overflowing && !open ? ' is-collapsed' : ''}`}>{children}</div>
    {overflowing && <button className="tour-detail-more" type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? copy[language].less : copy[language].more}</button>}
  </>
}

// Text content is listed as rows with the heading on the left and content on the right.
function DetailRow({ row, language }: { row: TourDetailRow; language: TourLanguage }) {
  const blocks = row.blocks.map((block, index) => block.kind === 'text' ? <p key={index} className="tour-detail-body">{block.text}</p>
    : block.kind === 'bullets' ? <ul key={index} className="tour-detail-bullets">{block.items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    : <ul key={index} className="tour-detail-included">{block.items.map((item, i) => <li key={i} className={item.included ? '' : 'is-excluded'}>
      {item.included ? <Check size={18} aria-label={language === 'tr' ? 'Dahil' : 'Included'} /> : <X size={18} aria-label={language === 'tr' ? 'Dahil değil' : 'Not included'} />}
      <span>{item.text}</span></li>)}</ul>)
  // Only rows with running text collapse; lists such as "Includes" stay fully visible.
  return <section className="tour-detail-row">
    <h2>{row.title}</h2>
    <div>{row.blocks.some(block => block.kind === 'text') ? <Collapsible language={language}>{blocks}</Collapsible> : blocks}</div>
  </section>
}

// The map library is only downloaded on pages that have a map.
const TourMap = lazy(() => import('./TourMap'))

// The route lists its stops as a numbered timeline; the other maps list their points with pins.
function MapRow({ section, title, language }: { section: TourPageSection; title: string; language: TourLanguage }) {
  const points = section.mapPoints ?? []
  const route = section.id === 'route'
  return <section className="tour-detail-row tour-detail-map" data-section-id={section.id}>
    <h2>{title}</h2>
    <div className={points.length ? 'tour-detail-map__grid' : ''}>
      <div>
        {section[language].body && <p className="tour-detail-body">{section[language].body}</p>}
        {points.length > 0 && <ol className={route ? 'tour-route' : 'tour-places'}>{points.map((point, index) => <li key={index}>
          <span className={`tour-map-pin${index === 0 ? ' is-first' : ''}`} aria-hidden="true">{route ? index + 1 : <MapPin size={15} />}</span>
          <div><strong>{pointName(point, language)}</strong>{pointNote(point, language) && <small>{pointNote(point, language)}</small>}</div>
        </li>)}</ol>}
      </div>
      {points.length > 0
        ? <Suspense fallback={<div className="tour-map" />}><TourMap points={points} route={route} language={language} /></Suspense>
        : <iframe src={section.mapUrl!} title={title} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />}
    </div>
  </section>
}

export function TourPageContent({ page, language, fallbackImage, onBook, bookingDisabled = false, preview = false, children }: {
  page: TourPageItem; language: TourLanguage; fallbackImage?: string; onBook: (date?: string, guests?: number) => void
  bookingDisabled?: boolean; preview?: boolean; children?: ReactNode
}) {
  const c = page.document[language]
  const image = resolvePageImage(page.document.heroImageUrl || fallbackImage || categoryImages[page.categoryKey])
  const gallery = page.document.sections.filter(section => section.type === 'gallery' && section.isVisible).flatMap(section => section.imageUrls)
  const details = tourDetailsFor(page.document, language)
  // Maps always come last, after the content: meeting point, route, then shuttle point.
  const maps = mapSlots.flatMap(slot => page.document.sections
    .filter(section => section.type === 'map' && section.id === slot.id && section.isVisible && (section.mapPoints?.length || isGoogleMapEmbed(section.mapUrl)))
    .map(section => ({ section, title: slot[language] })))
  return <div className="tour-page-content">
    <section className={`tour-page-hero tour-page-hero--${page.document.heroLayout}`}>
      <img className="tour-page-hero__image" src={image} alt="" />
      <div className="shell tour-page-hero__inner"><div>
        <span className="tour-page-eyebrow"><Waves size={18} />{c.eyebrow}</span>
        <h1>{c.title}</h1><p>{c.intro}</p>
        <button className="tour-page-button" type="button" disabled={bookingDisabled} onClick={() => onBook()}>{c.bookingLabel}<ArrowRight size={18} /></button>
      </div></div>
    </section>
    {/* Service pages are not a single tour, so only tour detail pages get the booking card. */}
    <div className={`shell tour-detail${page.externalTourId ? '' : ' tour-detail--wide'}`}>
      <div className="tour-detail__rows">
        <TourGallery images={gallery} title={c.title} language={language} />
        {isHtmlDetails(details) ? <TourHtml html={details} />
          : parseTourDetails(details).map((row, index) => <DetailRow key={index} row={row} language={language} />)}
        {maps.map(({ section, title }) => <MapRow key={section.id} section={section} title={title} language={language} />)}
      </div>
      {page.externalTourId && <div className="tour-detail__aside">
        <TourBookingCard tourId={preview ? null : page.externalTourId} language={language} bookingLabel={c.bookingLabel}
          notes={bookingNotesFor(c, language)} disabled={bookingDisabled} onBook={onBook} />
      </div>}
    </div>
    {children}
  </div>
}
