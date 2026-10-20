import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { resolvePageImage, type TourLanguage } from '../content/tour-pages'

const copy = {
  tr: { all: (count: number) => `Tümünü görüntüle (${count})`, open: (index: number) => `${index}. görseli büyüt`, close: 'Kapat', previous: 'Önceki görsel', next: 'Sonraki görsel', dialog: 'Tur görselleri' },
  en: { all: (count: number) => `View all (${count})`, open: (index: number) => `Enlarge image ${index}`, close: 'Close', previous: 'Previous image', next: 'Next image', dialog: 'Tour images' },
}

// Up to four images are shown as a mosaic (first image largest); every image opens in the viewer.
export function TourGallery({ images, title, language }: { images: string[]; title: string; language: TourLanguage }) {
  const [active, setActive] = useState<number | null>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const c = copy[language]
  const count = images.length
  const open = active !== null
  const move = (step: number) => setActive(index => index === null ? null : (index + step + count) % count)
  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActive(null)
      else if (event.key === 'ArrowLeft') setActive(index => index === null ? null : (index - 1 + count) % count)
      else if (event.key === 'ArrowRight') setActive(index => index === null ? null : (index + 1) % count)
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previousOverflow; previousFocus?.focus({ preventScroll: true }) }
  }, [open, count])
  if (!count) return null
  return <>
    <div className={`tour-gallery tour-gallery--${Math.min(count, 4)}`}>
      {images.slice(0, 4).map((url, index) => <button type="button" key={`${url}-${index}`} aria-label={c.open(index + 1)} onClick={() => setActive(index)}>
        <img src={resolvePageImage(url)} alt={`${title} ${index + 1}`} loading={index ? 'lazy' : 'eager'} />
      </button>)}
      <button type="button" className="tour-gallery__all" onClick={() => setActive(0)}><Images size={16} />{c.all(count)}</button>
    </div>
    {active !== null && <div className="tour-lightbox" role="dialog" aria-modal="true" aria-label={c.dialog} onMouseDown={event => { if (event.target === event.currentTarget) setActive(null) }}>
      <button ref={closeButton} type="button" className="tour-lightbox__close" aria-label={c.close} onClick={() => setActive(null)}><X size={24} /></button>
      {count > 1 && <button type="button" className="tour-lightbox__nav tour-lightbox__nav--prev" aria-label={c.previous} onClick={() => move(-1)}><ChevronLeft size={30} /></button>}
      <img src={resolvePageImage(images[active])} alt={`${title} ${active + 1}`} />
      {count > 1 && <button type="button" className="tour-lightbox__nav tour-lightbox__nav--next" aria-label={c.next} onClick={() => move(1)}><ChevronRight size={30} /></button>}
      <span className="tour-lightbox__count" aria-live="polite">{active + 1} / {count}</span>
    </div>}
  </>
}
