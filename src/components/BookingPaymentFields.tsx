import { LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { BookingSelect } from './BookingSelect'
import { istanbulToday } from '../lib/passengers'
import { formatMoney } from '../lib/tours'
import { paymentTexts, validPaymentCard, type PaymentCard } from '../lib/payments'

const emptyCard = (): PaymentCard => ({ holderName: '', number: '', securityCode: '', expiryMonth: 0, expiryYear: 0 })

export function BookingPaymentFields({ language, enabled = false, unavailable = false, busy = false, amount = 0, onPay }: {
  language: 'tr' | 'en'; enabled?: boolean; unavailable?: boolean; busy?: boolean; amount?: number
  onPay?: (card: PaymentCard) => Promise<void>
}) {
  const c = paymentTexts[language]
  const [card, setCard] = useState<PaymentCard>(emptyCard)
  const [error, setError] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const year = Number(istanbulToday().slice(0, 4))
  const update = (value: Partial<PaymentCard>) => { setCard((current) => ({ ...current, ...value })); setError('') }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!enabled || busy || !onPay) return
    if (!validPaymentCard(card, istanbulToday())) { setError(c.invalid); return }
    if (!acknowledged) return
    const submitted = { ...card, holderName: card.holderName.trim(), number: card.number.replace(/[ -]/g, '') }
    // Keep PAN/CVC only in memory for this request, never storage, URLs, analytics, logs or booking snapshots.
    setCard(emptyCard())
    setAcknowledged(false)
    await onPay(submitted)
  }
  const content = <section className="reservation-payment">
    <div className="reservation-section-heading"><h3><LockKeyhole size={17} /> {c.title}</h3><p>{enabled ? c.hint : unavailable ? c.unavailable : c.next}</p></div>
    <fieldset className="reservation-payment__fields" disabled={!enabled || busy} aria-label={c.title}>
      <label><span className="reservation-field-label">{c.holder}</span><input type="text" autoComplete="cc-name" name="cardholder" required={enabled} maxLength={160} minLength={2} value={card.holderName} onChange={(event) => update({ holderName: event.target.value })} /></label>
      <label><span className="reservation-field-label">{c.number}</span><input type="text" inputMode="numeric" autoComplete="cc-number" name="cardnumber" required={enabled} maxLength={23} placeholder="•••• •••• •••• ••••" value={card.number}
        onChange={(event) => update({ number: event.target.value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim() })} /></label>
      <BookingSelect label={c.month} value={card.expiryMonth ? String(card.expiryMonth) : ''} placeholder={c.monthPlaceholder} disabled={!enabled || busy}
        options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1).padStart(2, '0') }))} onChange={(value) => update({ expiryMonth: Number(value) })} />
      <BookingSelect label={c.year} value={card.expiryYear ? String(card.expiryYear) : ''} placeholder={c.yearPlaceholder} disabled={!enabled || busy}
        options={Array.from({ length: 21 }, (_, i) => ({ value: String(year + i), label: String(year + i) }))} onChange={(value) => update({ expiryYear: Number(value) })} />
      <label><span className="reservation-field-label">CVC</span><input type="password" inputMode="numeric" autoComplete="off" name="cvc" placeholder="•••" required={enabled} minLength={3} maxLength={4} pattern="[0-9]{3,4}" value={card.securityCode} onChange={(event) => update({ securityCode: event.target.value.replace(/\D/g, '').slice(0, 4) })} /></label>
    </fieldset>
    {enabled && <>
      <label className="reservation-consent"><input type="checkbox" required checked={acknowledged} disabled={busy} onChange={(event) => setAcknowledged(event.target.checked)} /><span>{c.acknowledge} <strong>{formatMoney(amount, language)}</strong></span></label>
      {error && <p className="reservation-error" role="alert">{error}</p>}
      <button className="button button--coral booking-submit" type="submit" disabled={busy}>{busy ? c.starting : `${c.pay} · ${formatMoney(amount, language)}`} <LockKeyhole size={17} /></button>
      <small className="reservation-payment-note">{c.secure}</small>
    </>}
  </section>
  return enabled ? <form onSubmit={submit} className="reservation-payment-form">{content}</form> : content
}
