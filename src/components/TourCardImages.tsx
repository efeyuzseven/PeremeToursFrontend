import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState, type TouchEvent } from 'react'

const copy = {
  tr: { previous: 'Önceki görsel', next: 'Sonraki görsel', position: (index: number, count: number) => `Görsel ${index} / ${count}` },
  en: { previous: 'Previous image', next: 'Next image', position: (index: number, count: number) => `Image ${index} of ${count}` },
}

// The picture area of a homepage tour card. One image is shown as is; several can be flipped through
// with the arrows or a touch swipe, and dots show which one is on screen.
export function TourCardImages({ images, position, title, language }: { images: string[]; position?: string; title: string; language: 'tr' | 'en' }) {
  const count = images.length
  const [index, setIndex] = useState(0)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const current = count ? index % count : 0
  const c = copy[language]
  if (count < 2) return <img src={images[0]} alt="" style={{ objectPosition: position }} />
  const move = (step: number) => setIndex((current + step + count) % count)
  const onTouchStart = (event: TouchEvent) => { touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY } }
  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const x = event.changedTouches[0].clientX - start.x
    const y = event.changedTouches[0].clientY - start.y
    if (Math.abs(x) > 40 && Math.abs(x) > Math.abs(y) * 1.5) move(x < 0 ? 1 : -1)
  }
  return <>
    <div className="tour-card__slides" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="tour-card__track" style={{ transform: `translateX(-${current * 100}%)` }}>
        {images.map((url, slide) => <img key={`${url}-${slide}`} src={url} alt="" loading={slide ? 'lazy' : undefined} style={slide ? undefined : { objectPosition: position }} />)}
      </div>
    </div>
    <button className="tour-card__arrow tour-card__arrow--previous" type="button" aria-label={`${title}: ${c.previous}`} onClick={() => move(-1)}><ChevronLeft size={18} /></button>
    <button className="tour-card__arrow tour-card__arrow--next" type="button" aria-label={`${title}: ${c.next}`} onClick={() => move(1)}><ChevronRight size={18} /></button>
    <div className="tour-card__dots" role="img" aria-label={c.position(current + 1, count)}>{images.map((url, slide) => <i key={`${url}-${slide}`} className={slide === current ? 'active' : ''} />)}</div>
  </>
}
