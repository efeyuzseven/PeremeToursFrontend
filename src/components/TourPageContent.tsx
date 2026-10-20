import { ArrowRight, Check, Waves, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { bookingNotesFor, categoryImages, resolvePageImage, type TourLanguage, type TourPageItem, type TourPageSection } from '../content/tour-pages'
import '../pages/tour-pages.css'
import { TourBookingCard } from './TourBookingCard'

const copy = {
  tr: { more: 'Daha fazlasını gör', less: 'Daha az göster' },
  en: { more: 'See more', less: 'See less' },
}

function ExpandableText({ text, language }: { text: string; language: TourLanguage }) {
  const [open, setOpen] = useState(false)
  const long = text.length > 320 || text.split('\n').length > 4
  return <div className="tour-detail-text">
    <p className={long && !open ? 'is-clamped' : ''}>{text}</p>
    {long && <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? copy[language].less : copy[language].more}</button>}
  </div>
}

// Tour detail pages list each section as a row: heading on the left, content on the right.
function DetailSection({ section, language }: { section: TourPageSection; language: TourLanguage }) {
  const content = section[language]
  const items = content.items.filter(item => item.trim())
  const excluded = (content.excludedItems ?? []).filter(item => item.trim())
  return <section className="tour-detail-row" data-section-id={section.id}>
    <h2>{content.title}</h2>
    <div>
      {content.body && (section.type === 'text' ? <ExpandableText text={content.body} language={language} /> : <p className="tour-detail-body">{content.body}</p>)}
      {section.type === 'highlights' && items.length > 0 && <ul className="tour-detail-bullets">{items.map((item, index) => <li key={index}>{item}</li>)}</ul>}
      {section.type === 'included' && <ul className="tour-detail-included">
        {items.map((item, index) => <li key={`in-${index}`}><Check size={18} aria-label={language === 'tr' ? 'Dahil' : 'Included'} /><span>{item}</span></li>)}
        {excluded.map((item, index) => <li key={`out-${index}`} className="is-excluded"><X size={18} aria-label={language === 'tr' ? 'Dahil değil' : 'Not included'} /><span>{item}</span></li>)}
      </ul>}
      {section.type === 'gallery' && <div className="tour-detail-gallery">{section.imageUrls.map((url, index) => <img key={`${url}-${index}`} src={resolvePageImage(url)} alt={`${content.title} ${index + 1}`} loading="lazy" />)}</div>}
    </div>
  </section>
}

export function TourPageContent({ page, language, fallbackImage, onBook, bookingDisabled = false, preview = false, children }: {
  page: TourPageItem; language: TourLanguage; fallbackImage?: string; onBook: (date?: string, guests?: number) => void
  bookingDisabled?: boolean; preview?: boolean; children?: ReactNode
}) {
  const c = page.document[language]
  const image = resolvePageImage(page.document.heroImageUrl || fallbackImage || categoryImages[page.categoryKey])
  const sections = page.document.sections.filter(section => section.isVisible)
  return <div className="tour-page-content">
    <section className={`tour-page-hero tour-page-hero--${page.document.heroLayout}`}>
      <img className="tour-page-hero__image" src={image} alt="" />
      <div className="shell tour-page-hero__inner"><div>
        <span className="tour-page-eyebrow"><Waves size={18} />{c.eyebrow}</span>
        <h1>{c.title}</h1><p>{c.intro}</p>
        <button className="tour-page-button" type="button" disabled={bookingDisabled} onClick={() => onBook()}>{c.bookingLabel}<ArrowRight size={18} /></button>
      </div></div>
    </section>
    {page.externalTourId ? <div className="shell tour-detail">
      <div className="tour-detail__rows">{sections.map(section => <DetailSection key={section.id} section={section} language={language} />)}</div>
      <div className="tour-detail__aside">
        <TourBookingCard tourId={preview ? null : page.externalTourId} language={language} bookingLabel={c.bookingLabel}
          notes={bookingNotesFor(c, language)} disabled={bookingDisabled} onBook={onBook} />
      </div>
    </div> : <div className="tour-page-sections">{sections.map(section => {
      const content = section[language]
      return <section className={`tour-page-section tour-page-section--${section.background}`} key={section.id} data-section-id={section.id}>
        <div className="shell"><header><span className="tour-page-eyebrow">DENTUR · PEREME</span><h2>{content.title}</h2></header>
          {content.body && <p className="tour-page-body">{content.body}</p>}
          {(section.type === 'highlights' || section.type === 'included') && <ul className="tour-page-highlights">{content.items.map((item, index) => <li key={index}><Check size={19} /><span>{item}</span></li>)}</ul>}
          {section.type === 'gallery' && <div className="tour-page-gallery">{section.imageUrls.map((url, index) => <img key={`${url}-${index}`} src={resolvePageImage(url)} alt={`${content.title} ${index + 1}`} loading="lazy" />)}</div>}
        </div>
      </section>
    })}</div>}
    {children}
  </div>
}
