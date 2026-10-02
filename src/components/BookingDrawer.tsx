import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, LoaderCircle, MapPin, Minus, Plus, RefreshCw, Ticket, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError, apiRequest } from '../lib/api'
import { formatMoney, isTryPrice, isUpcomingDeparture, loadTourBookingOptions, type PortAvailability, type TourQuote } from '../lib/tours'
import { BookingSelect } from './BookingSelect'
import { PassengerForm } from './PassengerForm'
import { BookingPaymentFields } from './BookingPaymentFields'
import { BookingPayment } from './BookingPayment'
import { getPaymentRecovery, type PaymentAvailability } from '../lib/payments'
import { emptyPassenger, isCompletePassenger, istanbulToday, maskIdentity, passengerTexts, type PassengerDetails } from '../lib/passengers'
import './booking.css'

const texts = {
  tr: {
    eyebrow: 'REZERVASYON BİLGİLERİ', lead: 'Yolculuğunu', accent: 'birlikte planlayalım.', close: 'Rezervasyonu kapat',
    loading: 'Güncel fiyatlar ve seferler alınıyor…', error: 'Tur bilgileri şu anda alınamıyor. Lütfen tekrar deneyin.', retry: 'Tekrar dene',
    empty: 'Bu tur için şu anda satışa açık sefer veya bilet fiyatı bulunmuyor.', port: 'Kalkış noktası', date: 'Tur tarihi', time: 'Kalkış saati',
    types: 'Bilet tipini seç', typeHint: 'Her bilet tipinden istediğin adedi seçebilirsin.', each: 'kişi başı', guests: 'misafir',
    decrease: 'Bilet azalt', increase: 'Bilet artır', max: 'Bir rezervasyonda en fazla 12 misafir seçilebilir.',
    contact: 'İletişim bilgileri', contactHint: 'Rezervasyonu yapacak kişinin bilgilerini gir.', name: 'Ad soyad', email: 'E-posta', phone: 'Telefon',
    consent: 'KVKK Aydınlatma Metni’ni okudum.', total: 'Toplam', live: 'Güncel API fiyatı', continue: 'Bilgileri kontrol et', checking: 'Fiyat kontrol ediliyor…',
    notice: 'Şu anda ödeme ve bilet kesimi kapalıdır. Bu adım rezervasyon oluşturmaz ve yer ayırmaz.',
    review: 'Rezervasyon önizlemesi', checked: 'Fiyat yeniden kontrol edildi', edit: 'Bilgileri düzenle',
    changed: 'API fiyatı güncellendi. Yeni toplam tutarı aşağıda görebilirsin.', back: 'Turlara dön',
    invalid: 'Lütfen bir sefer ve en az bir bilet seç.', quoteError: 'Seçim veya fiyat doğrulanamadı. Lütfen bilgileri kontrol edip tekrar dene.',
    invalidContact: 'Ad soyad ve telefon bilgilerini kontrol et. Telefon numarası en az 7 rakam içermeli.',
    privacy: 'İletişim ve yolcu bilgilerin, ödemeyi onayladığında rezervasyon ve biletleme için sunucuya iletilir.',
  },
  en: {
    eyebrow: 'BOOKING DETAILS', lead: 'Let’s plan', accent: 'your journey.', close: 'Close booking',
    loading: 'Loading current prices and departures…', error: 'Tour details could not be loaded. Please try again.', retry: 'Try again',
    empty: 'No departures or ticket prices are currently available for this tour.', port: 'Departure point', date: 'Tour date', time: 'Departure time',
    types: 'Choose your tickets', typeHint: 'Choose the quantity for each ticket type.', each: 'per person', guests: 'guests',
    decrease: 'Remove ticket', increase: 'Add ticket', max: 'Up to 12 guests per booking.',
    contact: 'Contact details', contactHint: 'Enter the booking contact’s details.', name: 'Full name', email: 'Email', phone: 'Phone',
    consent: 'I have read the KVKK Information Notice.', total: 'Total', live: 'Current API price', continue: 'Review details', checking: 'Checking prices…',
    notice: 'Payments and ticket issuance are currently disabled. This step does not create a booking or hold any places.',
    review: 'Booking preview', checked: 'Prices checked again', edit: 'Edit details',
    changed: 'The API price has changed. Your updated total is shown below.', back: 'Back to tours',
    invalid: 'Please select a departure and at least one ticket.', quoteError: 'Your selection or price could not be verified. Please check your details and try again.',
    invalidContact: 'Please check your full name and phone number. The phone number must contain at least 7 digits.',
    privacy: 'When you confirm payment, contact and passenger details are sent to the server for booking and ticket issuance.',
  },
}

export function BookingDrawer({ tour, language, initialDate, initialGuests, onClose }: {
  tour: { id: number; title: Record<'tr' | 'en', string>; image: string; duration: Record<'tr' | 'en', string> }
  language: 'tr' | 'en'; initialDate: string; initialGuests: number; onClose: () => void
}) {
  const { user, session } = useAuth()
  const c = texts[language]
  const pc = passengerTexts[language]
  const today = istanbulToday()
  const [options, setOptions] = useState<PortAvailability[] | null>(null)
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)
  const [portId, setPortId] = useState(0)
  const [date, setDate] = useState(initialDate)
  const [departureId, setDepartureId] = useState(0)
  const [quantities, setQuantities] = useState<Record<number, number> | null>(null)
  const [passengerData, setPassengerData] = useState<Record<string, PassengerDetails>>({})
  const [contact, setContact] = useState({
    name: [user?.firstName, user?.lastName].filter(Boolean).join(' '), email: user?.email ?? '', phone: '',
  })
  const [consent, setConsent] = useState(false)
  const [checking, setChecking] = useState(false)
  const [quoteError, setQuoteError] = useState('')
  const [quote, setQuote] = useState<TourQuote | null>(null)
  const [priceChanged, setPriceChanged] = useState(false)
  const [paymentEnabled, setPaymentEnabled] = useState(false)
  const [paymentLocked, setPaymentLocked] = useState(false)
  const [paymentBusy, setPaymentBusy] = useState(false)
  const [recovering] = useState(() => !!getPaymentRecovery())
  const drawer = useRef<HTMLElement>(null)
  const quoteController = useRef<AbortController | null>(null)
  const bookingRoot = useRef<HTMLDivElement>(null)
  const locale = language === 'tr' ? 'tr-TR' : 'en-US'
  const dateLabel = (value: string) => new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'long', year: 'numeric', weekday: 'short', timeZone: 'Europe/Istanbul',
  }).format(new Date(`${value}T12:00:00+03:00`))

  useEffect(() => {
    const controller = new AbortController()
    loadTourBookingOptions(tour.id, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setOptions(data) })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [tour.id, reload])

  useEffect(() => {
    const controller = new AbortController()
    apiRequest<PaymentAvailability>('/api/v1/payments/availability', { signal: controller.signal, cache: 'no-store' })
      .then((result) => { if (!controller.signal.aborted) setPaymentEnabled(result.enabled === true) })
      .catch(() => { if (!controller.signal.aborted) setPaymentEnabled(false) })
    return () => controller.abort()
  }, [reload])

  useEffect(() => {
    if (!paymentBusy) return
    const blockClose = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation() }
    }
    document.addEventListener('keydown', blockClose, true)
    return () => document.removeEventListener('keydown', blockClose, true)
  }, [paymentBusy])

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const root = document.getElementById('root')
    root?.setAttribute('inert', '')
    drawer.current?.focus()
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const focusable = Array.from(drawer.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href]') ?? [])
        .filter((element) => element.getClientRects().length > 0)
      const first = focusable[0]; const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === drawer.current)) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === drawer.current)) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', trapFocus)
    return () => {
      document.removeEventListener('keydown', trapFocus)
      root?.removeAttribute('inert')
      previousFocus?.focus({ preventScroll: true })
      quoteController.current?.abort()
    }
  }, [])

  const port = options?.find((item) => item.port.externalPortId === portId)
    ?? options?.find((item) => item.availability.departures.some((departure) => isUpcomingDeparture(departure)) && item.availability.prices.some(isTryPrice))
    ?? options?.[0]
  const departures = (port?.availability.departures ?? []).filter((item) => isUpcomingDeparture(item))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
  const dates = [...new Set(departures.flatMap((item) => item.date ? [item.date] : []))]
  const selectedDate = dates.includes(date) ? date : dates[0] ?? ''
  const dayDepartures = departures.filter((item) => item.date === selectedDate)
  const departure = dayDepartures.find((item) => item.externalId === departureId) ?? dayDepartures[0]
  const prices = (port?.availability.prices ?? []).filter(isTryPrice)
  const firstPrice = prices.find((item) => item.amount > 0) ?? prices[0]
  const counts = quantities ?? (firstPrice ? { [firstPrice.externalPriceId]: initialGuests } : {})
  const guestCount = prices.reduce((sum, item) => sum + (counts[item.externalPriceId] ?? 0), 0)
  const total = prices.reduce((sum, item) => sum + item.amount * (counts[item.externalPriceId] ?? 0), 0)
  const passengerSlots = prices.flatMap((price) => Array.from({ length: counts[price.externalPriceId] ?? 0 }, (_, index) => {
    const key = `${price.externalPriceId}:${index}`
    return { key, externalPriceId: price.externalPriceId, ticketType: (language === 'en' ? price.passengerTypeEn || price.passengerType : price.passengerType), details: passengerData[key] ?? emptyPassenger() }
  }))
  const bookingNote = language === 'en' ? port?.availability.bookingNoteEn || port?.availability.bookingNote : port?.availability.bookingNote
  const ready = !!port && !!departure && prices.length > 0
  const clearQuoteError = () => setQuoteError('')
  const changeQuantity = (priceId: number, quantity: number) => {
    setQuantities({ ...counts, [priceId]: quantity })
    // Remove details belonging to a removed ticket; adding it again starts with a blank passenger.
    setPassengerData((current) => Object.fromEntries(Object.entries(current).filter(([key]) =>
      !key.startsWith(`${priceId}:`) || Number(key.split(':')[1]) < quantity)))
    clearQuoteError()
  }
  const retry = () => { setError(false); setQuoteError(''); setOptions(null); setQuantities(null); setReload((value) => value + 1) }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!port || !departure || guestCount < 1 || guestCount > 12 || !consent) { setQuoteError(c.invalid); return }
    if (contact.name.trim().length < 2 || contact.phone.replace(/\D/g, '').length < 7) { setQuoteError(c.invalidContact); return }
    const invalidPassengerIndex = passengerSlots.findIndex((slot) => !isCompletePassenger(slot.details, today))
    if (invalidPassengerIndex >= 0) {
      setQuoteError(pc.invalid)
      drawer.current?.querySelectorAll('.reservation-passenger')[invalidPassengerIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setChecking(true); setQuoteError('')
    const controller = new AbortController()
    quoteController.current = controller
    try {
      const result = await apiRequest<TourQuote>('/api/v1/tours/quote', {
        method: 'POST', signal: controller.signal,
        body: {
          externalTourId: tour.id, externalDeparturePortId: port.port.externalPortId,
          externalDepartureId: departure.externalId, tourDate: selectedDate,
          tickets: prices.filter((item) => (counts[item.externalPriceId] ?? 0) > 0)
            .map((item) => ({ externalPriceId: item.externalPriceId, quantity: counts[item.externalPriceId] })),
        },
      })
      if (controller.signal.aborted) return
      setPriceChanged(Math.abs(result.amount - total) > 0.005)
      setQuote(result)
      drawer.current?.scrollTo({ top: 0, behavior: 'smooth' })
      requestAnimationFrame(() => bookingRoot.current?.focus({ preventScroll: true }))
    } catch (failure) {
      if (!controller.signal.aborted) setQuoteError(language === 'tr' && failure instanceof ApiError && failure.status === 400 ? failure.message : c.quoteError)
    } finally {
      if (!controller.signal.aborted) setChecking(false)
    }
  }

  return createPortal(<div className="booking-overlay booking-overlay--open" onMouseDown={(event) => {
    if (event.target === event.currentTarget && !checking && !paymentBusy) onClose()
  }}>
    <aside className="booking-drawer reservation-drawer" ref={drawer} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="booking-title">
      <button className="booking-drawer__close" type="button" onClick={onClose} disabled={paymentBusy || checking} aria-label={c.close}><X /></button>
      <div className="booking-drawer__top"><span className="eyebrow"><Ticket size={17} /> {quote ? c.review : c.eyebrow}</span>
        <h2 id="booking-title">{c.lead}<br /><em>{c.accent}</em></h2></div>
      <div className="booking-mini-card"><img src={tour.image} alt="" /><div><strong>{tour.title[language]}</strong><small><Clock3 size={14} /> {tour.duration[language]}</small></div></div>

      {recovering ? <BookingPayment language={language} enabled={false} onLockChange={setPaymentLocked} onBusyChange={setPaymentBusy} onFinish={onClose} />
        : error ? <div className="reservation-status" role="alert"><p>{c.error}</p><button type="button" onClick={retry}><RefreshCw size={16} /> {c.retry}</button></div>
        : !options ? <div className="reservation-status" role="status"><LoaderCircle className="reservation-spinner" /> {c.loading}</div>
        : !ready ? <div className="reservation-status"><p>{c.empty}</p>{options.length > 1 && <BookingSelect label={c.port} value={String(port?.port.externalPortId ?? '')} options={options.map((item) => ({ value: String(item.port.externalPortId), label: item.port.name }))} onChange={(value) => { setPortId(Number(value)); setQuantities(null) }} />}<button type="button" onClick={retry}><RefreshCw size={16} /> {c.retry}</button></div>
        : quote ? <div className="reservation-review" ref={bookingRoot} tabIndex={-1}>
          <span className="reservation-verified"><Check size={16} /> {c.checked}</span>
          <div className="reservation-itinerary"><span><MapPin /> {quote.portName}</span><span><CalendarDays /> {dateLabel(quote.tourDate)}</span><span><Clock3 /> {quote.departureTime.slice(0, 5)}</span></div>
          <div className="reservation-review__tickets">{quote.tickets.map((item) => <div key={item.externalPriceId}><span>{item.quantity} × {language === 'en' ? item.ticketTypeEn || item.ticketType : item.ticketType}<small>{formatMoney(item.unitAmount, language)} {c.each}</small></span><strong>{formatMoney(item.amount, language)}</strong></div>)}</div>
          <div className="reservation-review__contact"><h3>{c.contact}</h3><strong>{contact.name.trim()}</strong><span>{contact.email.trim()}</span><span>{contact.phone.trim()}</span></div>
          <section className="reservation-review__passengers"><h3>{pc.title}</h3>{passengerSlots.map((slot, index) => <div className="reservation-review__passenger" key={slot.key}>
            <small>{index + 1}. {pc.passenger} · {slot.ticketType}</small>
            <strong>{slot.details.firstName.trim()} {slot.details.lastName.trim()}</strong>
            <span>{slot.details.gender === 'male' ? pc.male : pc.female} · {slot.details.nationality === 'TR' ? pc.turkish : pc.foreign}</span>
            <span>{pc.identity}: {maskIdentity(slot.details.identityNumber)}</span>
            <span>{pc.birthDate}: {dateLabel(slot.details.birthDate)}</span>
          </div>)}</section>
          {priceChanged && <p className="reservation-notice" role="status">{c.changed}</p>}
          <div className="booking-total"><span>{c.total}<small>{quote.guestCount} {c.guests}</small></span><strong>{formatMoney(quote.amount, language, quote.currency)}</strong></div>
          {!paymentEnabled && <p className="reservation-notice">{c.notice}</p>}
          <BookingPayment language={language} token={session?.accessToken} enabled={paymentEnabled} onLockChange={setPaymentLocked} onBusyChange={setPaymentBusy} onFinish={onClose}
            booking={{ quote, externalTourId: tour.id, externalDeparturePortId: port.port.externalPortId, externalDepartureId: departure.externalId,
              passengers: passengerSlots.map((slot) => ({ ...slot.details, externalPriceId: slot.externalPriceId })), contact, privacyNoticeAccepted: consent }} />
          <button className="button button--navy booking-submit" type="button" disabled={paymentLocked} onClick={() => { setQuote(null); setQuoteError('') }}><ArrowLeft size={17} /> {c.edit}</button>
          <button className="reservation-back" type="button" disabled={paymentBusy} onClick={onClose}>{c.back} <ArrowRight size={16} /></button>
        </div> : <form className="reservation-form" onSubmit={submit}>
          <fieldset disabled={checking}>
            <div className="reservation-fields">
              <BookingSelect label={c.port} value={String(port.port.externalPortId)} options={options.map((item) => ({ value: String(item.port.externalPortId), label: item.port.name }))}
                onChange={(value) => { setPortId(Number(value)); setDepartureId(0); setQuantities(null); setPassengerData({}); clearQuoteError() }} />
              <BookingSelect label={c.date} value={selectedDate} options={dates.map((value) => ({ value, label: dateLabel(value) }))}
                onChange={(value) => { setDate(value); setDepartureId(0); clearQuoteError() }} />
              <BookingSelect label={c.time} value={String(departure.externalId)} options={dayDepartures.map((item) => ({ value: String(item.externalId), label: item.time!.slice(0, 5) }))}
                onChange={(value) => { setDepartureId(Number(value)); clearQuoteError() }} />
            </div>
            <section className="reservation-ticket-types"><div className="reservation-section-heading"><h3>{c.types}</h3><p>{c.typeHint}</p></div>
              {prices.map((price) => { const name = (language === 'en' ? price.passengerTypeEn || price.passengerType : price.passengerType) || `#${price.externalPriceId}`; const count = counts[price.externalPriceId] ?? 0
                return <div className={`reservation-ticket-type ${count > 0 ? 'reservation-ticket-type--selected' : ''}`} key={price.externalPriceId}>
                  <div><strong>{name}</strong><span>{formatMoney(price.amount, language)} <small>{c.each}</small></span></div>
                  <div className="reservation-counter"><button type="button" disabled={count === 0} aria-label={`${name}: ${c.decrease}`} onClick={() => changeQuantity(price.externalPriceId, count - 1)}><Minus size={16} /></button><output aria-label={name} aria-live="polite">{count}</output><button type="button" disabled={guestCount >= 12} aria-label={`${name}: ${c.increase}`} onClick={() => changeQuantity(price.externalPriceId, count + 1)}><Plus size={16} /></button></div>
                </div>
              })}<small className="reservation-helper">{c.max}</small>
            </section>
            {bookingNote && <p className="reservation-notice">{bookingNote}</p>}
            <section className="reservation-contact"><div className="reservation-section-heading"><h3>{c.contact}</h3><p>{c.contactHint}</p></div>
              <label><span className="reservation-field-label">{c.name}</span><input autoComplete="name" name="name" required minLength={2} maxLength={160} value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} /></label>
              <label><span className="reservation-field-label">{c.email}</span><input type="email" autoComplete="email" name="email" required maxLength={320} value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} /></label>
              <label><span className="reservation-field-label">{c.phone}</span><input type="tel" autoComplete="tel" name="phone" required minLength={7} maxLength={32} pattern={'[+0-9\\s\\(\\)\\.\\-]{7,32}'} value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} /></label>
            </section>
            <section className="reservation-passengers"><div className="reservation-section-heading"><h3>{pc.title}</h3><p>{pc.hint}</p></div>
              {passengerSlots.map((slot, index) => <PassengerForm key={slot.key} index={index} ticketType={slot.ticketType} passenger={slot.details} language={language} today={today}
                onChange={(value) => { setPassengerData((current) => ({ ...current, [slot.key]: value })); clearQuoteError() }} />)}
            </section>
            <BookingPaymentFields language={language} unavailable={!paymentEnabled} />
            <div className="reservation-contact">
              <label className="reservation-consent"><input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span><Link to="/kvkk-aydinlatma-metni" target="_blank" rel="noopener noreferrer">{c.consent}</Link></span></label>
              <small className="reservation-helper">{c.privacy}</small>
            </div>
          </fieldset>
          {quoteError && <div className="reservation-error" role="alert">{quoteError}<button className="reservation-back" type="button" onClick={retry}><RefreshCw size={16} /> {c.retry}</button></div>}
          <div className="booking-total" aria-live="polite"><span>{c.total}<small>{guestCount} {c.guests} · {c.live}</small></span><strong>{formatMoney(total, language)}</strong></div>
          <button className="button button--coral booking-submit" type="submit" disabled={checking || guestCount < 1}>{checking ? <><LoaderCircle className="reservation-spinner" size={18} /> {c.checking}</> : <>{c.continue} <ArrowRight size={18} /></>}</button>
          <p className="reservation-payment-note">{paymentEnabled
            ? (language === 'tr' ? 'Bu adımda tahsilat yapılmaz. Sonraki ekranda tutarı onaylayıp 3D Secure ile ödeme yapabilirsin.' : 'No charge is made at this step. Confirm the amount and pay with 3D Secure on the next screen.')
            : c.notice}</p>
        </form>}
    </aside>
  </div>, document.body)
}
