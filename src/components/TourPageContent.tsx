import { ArrowRight, Check, Waves } from 'lucide-react'
import type { ReactNode } from 'react'
import { categoryImages, resolvePageImage, type TourLanguage, type TourPageItem } from '../content/tour-pages'
import '../pages/tour-pages.css'

export function TourPageContent({ page, language, fallbackImage, onBook, bookingDisabled = false, children }: {
  page: TourPageItem; language: TourLanguage; fallbackImage?: string; onBook: () => void; bookingDisabled?: boolean; children?: ReactNode
}) {
  const c = page.document[language]
  const image = resolvePageImage(page.document.heroImageUrl || fallbackImage || categoryImages[page.categoryKey])
  return <div className="tour-page-content">
    <section className={`tour-page-hero tour-page-hero--${page.document.heroLayout}`}>
      <img className="tour-page-hero__image" src={image} alt="" />
      <div className="shell tour-page-hero__inner"><div>
        <span className="tour-page-eyebrow"><Waves size={18} />{c.eyebrow}</span>
        <h1>{c.title}</h1><p>{c.intro}</p>
        <button className="tour-page-button" type="button" disabled={bookingDisabled} onClick={onBook}>{c.bookingLabel}<ArrowRight size={18} /></button>
      </div></div>
    </section>
    <div className="tour-page-sections">{page.document.sections.filter(section => section.isVisible).map(section => {
      const content = section[language]
      return <section className={`tour-page-section tour-page-section--${section.background}`} key={section.id} data-section-id={section.id}>
        <div className="shell"><header><span className="tour-page-eyebrow">DENTUR · PEREME</span><h2>{content.title}</h2></header>
          {content.body && <p className="tour-page-body">{content.body}</p>}
          {section.type === 'highlights' && <ul className="tour-page-highlights">{content.items.map((item, index) => <li key={index}><Check size={19} /><span>{item}</span></li>)}</ul>}
          {section.type === 'gallery' && <div className="tour-page-gallery">{section.imageUrls.map((url, index) => <img key={`${url}-${index}`} src={resolvePageImage(url)} alt={`${content.title} ${index + 1}`} loading="lazy" />)}</div>}
        </div>
      </section>
    })}</div>
    {children}
  </div>
}
