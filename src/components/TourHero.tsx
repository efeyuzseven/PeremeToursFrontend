import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import type { TourLanguage } from '../content/tour-pages'

const copy = {
  tr: { group: 'Kapak görselleri', previous: 'Önceki görsel', next: 'Sonraki görsel', show: (index: number) => `${index}. görseli göster` },
  en: { group: 'Cover images', previous: 'Previous image', next: 'Next image', show: (index: number) => `Show image ${index}` },
}
const slideInterval = 5000

// The tour page hero. One image is a plain cover; several slide sideways every few seconds, with arrows,
// dots and touch swipe. Sliding pauses while the pointer or keyboard focus is on the hero.
export function TourHero({ layout, images, language, children }: { layout: 'cover' | 'split'; images: string[]; language: TourLanguage; children: ReactNode }) {
  const count = images.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const current = count ? index % count : 0
  const c = copy[language]
  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return
    // Restarts whenever the slide changes, so a manual change gets a full interval too.
    const timer = window.setTimeout(() => setIndex(value => (value + 1) % count), slideInterval)
    return () => window.clearTimeout(timer)
  }, [count, paused, reducedMotion, current])
  if (count < 2) return <section className={`tour-page-hero tour-page-hero--${layout}`}>
    <img className="tour-page-hero__image" src={images[0]} alt="" />
    {children}
  </section>
  const move = (step: number) => setIndex((current + step + count) % count)
  const onTouchStart = (event: TouchEvent) => { touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY } }
  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const x = event.changedTouches[0].clientX - start.x
    const y = event.changedTouches[0].clientY - start.y
    if (Math.abs(x) > 50 && Math.abs(x) > Math.abs(y) * 1.5) move(x < 0 ? 1 : -1)
  }
  return <section className={`tour-page-hero tour-page-hero--${layout} tour-page-hero--slider`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
    <div className="tour-page-hero__slides" aria-hidden="true">
      <div className="tour-page-hero__track" style={{ transform: `translateX(-${current * 100}%)` }}>
        {images.map((url, slide) => <img key={`${url}-${slide}`} src={url} alt="" loading={slide ? 'lazy' : 'eager'} />)}
      </div>
    </div>
    {children}
    <div className="tour-page-hero__controls" role="group" aria-label={c.group}>
      <button type="button" aria-label={c.previous} onClick={() => move(-1)}><ChevronLeft size={20} /></button>
      <div>{images.map((url, slide) => <button type="button" key={`${url}-${slide}`} className={slide === current ? 'active' : ''}
        aria-label={c.show(slide + 1)} aria-current={slide === current ? 'true' : undefined} onClick={() => setIndex(slide)} />)}</div>
      <button type="button" aria-label={c.next} onClick={() => move(1)}><ChevronRight size={20} /></button>
    </div>
  </section>
}
