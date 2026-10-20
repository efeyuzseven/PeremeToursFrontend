import { CalendarDays, CircleCheck, Minus, Plus, Ticket, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { TourLanguage, TourPageBookingNote } from '../content/tour-pages'
import { formatMoney, isTryPrice, isUpcomingDeparture, loadTourBookingOptions, type PortAvailability } from '../lib/tours'

const copy = {
  tr: { from: 'Başlangıç fiyatı', perPerson: 'kişi başı', guests: 'Misafir', guest: (count: number) => `${count} misafir`, date: 'Tarih',
    decrease: 'Misafir azalt', increase: 'Misafir ekle', loading: 'Güncel fiyatlar yükleniyor…', noDates: 'Şu anda uygun sefer bulunmuyor.',
    unavailable: 'Fiyatlar şu anda alınamıyor.', preview: 'Fiyat ve tarihler yayındaki sayfada EasyTicket’tan canlı gelir.' },
  en: { from: 'From', perPerson: 'per person', guests: 'Guests', guest: (count: number) => `${count} ${count === 1 ? 'guest' : 'guests'}`, date: 'Date',
    decrease: 'Remove guest', increase: 'Add guest', loading: 'Loading current prices…', noDates: 'There are no available departures right now.',
    unavailable: 'Prices are currently unavailable.', preview: 'Prices and dates load live from EasyTicket on the published page.' },
}

// tourId is null in the admin preview: the card renders without calling the live catalog.
export function TourBookingCard({ tourId, language, bookingLabel, notes, disabled = false, onBook }: {
  tourId: number | null; language: TourLanguage; bookingLabel: string; notes: TourPageBookingNote[]; disabled?: boolean
  onBook: (date: string, guests: number) => void
}) {
  const [options, setOptions] = useState<PortAvailability[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [guests, setGuests] = useState(1)
  const [date, setDate] = useState('')
  const c = copy[language]
  useEffect(() => {
    if (!tourId) return
    const controller = new AbortController()
    loadTourBookingOptions(tourId, controller.signal)
      .then(result => { if (!controller.signal.aborted) setOptions(result) })
      .catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [tourId])
  const { price, dates } = useMemo(() => {
    const bookable = (options ?? []).filter(item => item.availability.departures.some(departure => isUpcomingDeparture(departure)))
    const amounts = bookable.flatMap(item => item.availability.prices.filter(entry => isTryPrice(entry) && entry.amount > 0).map(entry => entry.amount))
    const upcoming = bookable.flatMap(item => item.availability.departures.filter(departure => isUpcomingDeparture(departure)).map(departure => departure.date!))
    return { price: amounts.length ? Math.min(...amounts) : null, dates: [...new Set(upcoming)].sort() }
  }, [options])
  const selectedDate = dates.includes(date) ? date : dates[0] ?? ''
  const dateLabel = (value: string) => new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric', month: 'long', weekday: 'short', timeZone: 'Europe/Istanbul',
  }).format(new Date(`${value}T12:00:00+03:00`))
  const loading = !!tourId && !options && !failed
  const status = !tourId ? c.preview : loading ? c.loading : failed ? c.unavailable : !selectedDate ? c.noDates : ''
  return <aside className="tour-booking-card" aria-label={bookingLabel}>
    <div className="tour-booking-card__price" aria-live="polite">
      {price !== null ? <><small>{c.from}</small><p><strong>{formatMoney(price, language)}</strong> <span>{c.perPerson}</span></p></>
        : <p className="tour-booking-card__status">{status}</p>}
    </div>
    <div className="tour-booking-card__field">
      <Users size={18} aria-hidden="true" /><span>{c.guest(guests)}</span>
      <div className="tour-booking-card__stepper" role="group" aria-label={c.guests}>
        <button type="button" aria-label={c.decrease} disabled={guests <= 1} onClick={() => setGuests(value => Math.max(1, value - 1))}><Minus size={15} /></button>
        <button type="button" aria-label={c.increase} disabled={guests >= 12} onClick={() => setGuests(value => Math.min(12, value + 1))}><Plus size={15} /></button>
      </div>
    </div>
    <label className="tour-booking-card__field">
      <CalendarDays size={18} aria-hidden="true" />
      <select aria-label={c.date} value={selectedDate} disabled={!dates.length} onChange={event => setDate(event.target.value)}>
        {dates.length ? dates.map(value => <option key={value} value={value}>{dateLabel(value)}</option>) : <option value="">{c.date}</option>}
      </select>
    </label>
    {price !== null && status && <p className="tour-booking-card__status">{status}</p>}
    <button className="tour-booking-card__button" type="button" disabled={disabled || !selectedDate} onClick={() => onBook(selectedDate, guests)}>
      <Ticket size={18} />{bookingLabel}
    </button>
    {notes.length > 0 && <ul className="tour-booking-card__notes">{notes.map((note, index) => <li key={index}>
      <CircleCheck size={22} aria-hidden="true" /><div><strong>{note.title}</strong>{note.text && <span>{note.text}</span>}</div>
    </li>)}</ul>}
  </aside>
}
