import { ArrowRight, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'
import './google-reviews.css'

type Language = 'tr' | 'en'
type GoogleReview = { authorName: string; authorUrl: string | null; authorPhotoUrl: string | null; rating: number; text: string; translated: boolean; relativeTime: string | null }
type GoogleReviewSummary = { rating: number; totalCount: number; mapsUrl: string; reviews: GoogleReview[] }

const copy = {
  tr: { eyebrow: 'Google yorumları', lead: 'Misafirlerimiz', accent: 'ne diyor?', count: (count: string) => `${count} Google yorumu`, all: 'Google’da tüm yorumlar', translated: 'Google tarafından çevrildi', stars: (value: number) => `5 üzerinden ${value} yıldız` },
  en: { eyebrow: 'Google reviews', lead: 'What our guests', accent: 'are saying', count: (count: string) => `${count} Google reviews`, all: 'All reviews on Google', translated: 'Translated by Google', stars: (value: number) => `${value} out of 5 stars` },
}

function Stars({ value, label }: { value: number; label: string }) {
  return <span className="google-reviews__stars" role="img" aria-label={label}>
    {[1, 2, 3, 4, 5].map((index) => <Star key={index} size={15} fill={index <= Math.round(value) ? 'currentColor' : 'none'} aria-hidden="true" />)}
  </span>
}

// Shows the business's Google rating and latest reviews; renders nothing until they load or when they cannot be loaded.
export default function GoogleReviews({ language }: { language: Language }) {
  const [summary, setSummary] = useState<GoogleReviewSummary | null>(null)
  const c = copy[language]
  const locale = language === 'tr' ? 'tr-TR' : 'en-GB'

  useEffect(() => {
    const controller = new AbortController()
    apiRequest<GoogleReviewSummary>(`/api/v1/google-reviews?language=${language}`, { signal: controller.signal })
      .then(setSummary)
      .catch(() => { if (!controller.signal.aborted) setSummary(null) })
    return () => controller.abort()
  }, [language])

  if (!summary || summary.reviews.length === 0) return null
  const rating = summary.rating.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  return <section className="google-reviews" id="yorumlar" aria-labelledby="google-reviews-title">
    <div className="shell">
      <div className="google-reviews__header">
        <div><div className="eyebrow"><Star size={17} /> {c.eyebrow}</div><h2 id="google-reviews-title">{c.lead} <em>{c.accent}</em></h2></div>
        <a className="google-reviews__score" href={summary.mapsUrl} target="_blank" rel="noopener noreferrer">
          <strong>{rating}</strong>
          <span><Stars value={summary.rating} label={c.stars(summary.rating)} /><small>{c.count(summary.totalCount.toLocaleString(locale))}</small></span>
        </a>
      </div>
      <div className="google-reviews__list">{summary.reviews.map((review, index) => <article key={`${review.authorName}-${index}`}>
        <header>
          {review.authorPhotoUrl
            ? <img src={review.authorPhotoUrl} alt="" width={40} height={40} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
            : <span className="google-reviews__initial" aria-hidden="true">{review.authorName.charAt(0).toLocaleUpperCase(locale)}</span>}
          <div>
            {review.authorUrl ? <a href={review.authorUrl} target="_blank" rel="noopener noreferrer">{review.authorName}</a> : <strong>{review.authorName}</strong>}
            {review.relativeTime && <small>{review.relativeTime}</small>}
          </div>
        </header>
        <Stars value={review.rating} label={c.stars(review.rating)} />
        <p>{review.text}</p>
        {review.translated && <small className="google-reviews__translated">{c.translated}</small>}
      </article>)}</div>
      <a className="google-reviews__all" href={summary.mapsUrl} target="_blank" rel="noopener noreferrer">{c.all} <ArrowRight size={17} /></a>
    </div>
  </section>
}
