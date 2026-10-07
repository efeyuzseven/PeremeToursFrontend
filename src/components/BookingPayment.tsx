import { CheckCircle2, CircleAlert, LoaderCircle, LockKeyhole, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ApiError, apiBaseUrl, apiRequest } from '../lib/api'
import { getPaymentRecovery, paymentRecoveryKey as recoveryKey, paymentTexts, type PaymentBooking, type PaymentCard, type PaymentStart, type PaymentStatus } from '../lib/payments'
import { BookingPaymentFields } from './BookingPaymentFields'

export function BookingPayment({ booking, language, token, enabled, onLockChange, onBusyChange, onFinish }: {
  booking?: PaymentBooking; language: 'tr' | 'en'; token?: string; enabled: boolean
  onLockChange: (locked: boolean) => void; onBusyChange: (busy: boolean) => void; onFinish: () => void
}) {
  const c = paymentTexts[language]
  const [initialAttempt] = useState(() => {
    const recovered = getPaymentRecovery()
    return { id: recovered ?? crypto.randomUUID(), recovered: !!recovered, deadline: Date.now() + 10 * 60_000 }
  })
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [requiresReview, setRequiresReview] = useState(false)
  const [payment, setPayment] = useState<PaymentStart | null>(null)
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [uncertain, setUncertain] = useState(initialAttempt.recovered)
  const [checking, setChecking] = useState(false)
  const attemptId = useRef(initialAttempt.id)
  const submitted = useRef(initialAttempt.recovered)
  const pollDeadline = useRef(initialAttempt.deadline)
  const iframe = useRef<HTMLIFrameElement>(null)
  const active = useRef(true)
  const statusInFlight = useRef(false)
  const locked = starting || !!payment || uncertain || !!status

  useEffect(() => { onLockChange(locked) }, [locked, onLockChange])
  useEffect(() => { onBusyChange(starting || !!payment) }, [starting, payment, onBusyChange])
  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])

  const readStatus = async () => {
    if (statusInFlight.current) return
    statusInFlight.current = true
    setChecking(true)
    try {
      const result = await apiRequest<PaymentStatus>('/api/v1/payments/tour/status', {
        headers: { 'X-Payment-Token': attemptId.current }, cache: 'no-store', signal: AbortSignal.timeout(15_000),
      })
      if (!active.current) return
      setStatus(result)
      if (result.paymentStatus === 'Paid' || result.paymentStatus === 'Failed' || result.paymentStatus === 'ReviewRequired' || result.paymentStatus === 'Refunded') {
        setPayment(null)
        setUncertain(false)
      }
    } catch (failure) {
      // A failed lookup does NOT mean a failed charge. Keep the attempt token and prohibit a new charge.
      if (active.current && !(failure instanceof ApiError && failure.status === 404)) setUncertain(true)
    } finally {
      statusInFlight.current = false
      if (active.current) setChecking(false)
    }
  }
  const readStatusRef = useRef(readStatus)
  useEffect(() => { readStatusRef.current = readStatus })

  useEffect(() => {
    const needsTickets = status?.paymentStatus === 'Paid' && ['Pending', 'Processing'].includes(status.ticketingStatus)
    if (!payment && !uncertain && !needsTickets && (!status || !['Pending', 'Processing'].includes(status.paymentStatus))) return
    // Check both the callback's API origin and the actual frame Window, then fetch the server-side result.
    const receive = (event: MessageEvent) => {
      if (!iframe.current || event.origin !== new URL(apiBaseUrl).origin || event.source !== iframe.current.contentWindow || event.data?.source !== 'PeremeToursPayment'
        || event.data?.ticketCode !== payment?.ticketCode) return
      void readStatusRef.current()
    }
    window.addEventListener('message', receive)
    const timer = window.setInterval(() => {
      if (Date.now() > pollDeadline.current) { window.clearInterval(timer); setPayment(null); setUncertain(true); return }
      void readStatusRef.current()
    }, 5000)
    return () => { window.removeEventListener('message', receive); window.clearInterval(timer) }
  }, [payment, uncertain, status])

  useEffect(() => {
    if (!starting && !payment && !uncertain) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [starting, payment, uncertain])

  const pay = async (card: PaymentCard) => {
    if (submitted.current || starting || !enabled || !booking) return
    submitted.current = true
    pollDeadline.current = Date.now() + 10 * 60_000
    // Recovery stores only an opaque attempt token, never card or passenger data.
    try { sessionStorage.setItem(recoveryKey, attemptId.current) } catch { /* Memory-only fallback. */ }
    setStarting(true); setError('')
    try {
      const result = await apiRequest<PaymentStart>('/api/v1/payments/tour/initialize', {
        method: 'POST', token, signal: AbortSignal.timeout(60_000),
        body: {
          externalTourId: booking.externalTourId, externalDeparturePortId: booking.externalDeparturePortId,
          externalDepartureId: booking.externalDepartureId, tourDate: booking.quote.tourDate,
          tickets: booking.quote.tickets.map((item) => ({ externalPriceId: item.externalPriceId, quantity: item.quantity })),
          passengers: booking.passengers, customerName: booking.contact.name.trim(), customerEmail: booking.contact.email.trim(),
          customerPhone: booking.contact.phone.trim(), language, expectedAmount: booking.quote.amount,
          attemptId: attemptId.current, privacyNoticeAccepted: booking.privacyNoticeAccepted, card,
        },
      })
      if (active.current) { setPayment(result); setUncertain(false) }
    } catch (failure) {
      if (!active.current) return
      if (failure instanceof ApiError && failure.status === 400) {
        submitted.current = false
        try { sessionStorage.removeItem(recoveryKey) } catch { /* Memory-only fallback. */ }
        setError(language === 'tr' ? failure.message : c.error)
      } else if (failure instanceof ApiError && failure.status === 409) {
        // A conflict may be a price change OR an existing attempt. Resolve the attempt before allowing edits.
        try {
          const existing = await apiRequest<PaymentStatus>('/api/v1/payments/tour/status', { headers: { 'X-Payment-Token': attemptId.current }, cache: 'no-store', signal: AbortSignal.timeout(15_000) })
          if (active.current) setStatus(existing)
        } catch (lookupFailure) {
          if (lookupFailure instanceof ApiError && lookupFailure.status === 404) {
            submitted.current = false; setError(c.changed); setRequiresReview(true)
            try { sessionStorage.removeItem(recoveryKey) } catch { /* Memory-only fallback. */ }
          }
          else setUncertain(true)
        }
      } else if (failure instanceof ApiError && (failure.status === 503 || failure.status === 429)) {
        try {
          const existing = await apiRequest<PaymentStatus>('/api/v1/payments/tour/status', { headers: { 'X-Payment-Token': attemptId.current }, cache: 'no-store', signal: AbortSignal.timeout(15_000) })
          if (active.current) setStatus(existing)
        } catch (lookupFailure) {
          if (lookupFailure instanceof ApiError && lookupFailure.status === 404) {
            submitted.current = false; setError(c.error)
            try { sessionStorage.removeItem(recoveryKey) } catch { /* Memory-only fallback. */ }
          } else setUncertain(true)
        }
      } else {
        setUncertain(true)
        await readStatusRef.current()
      }
    } finally { if (active.current) setStarting(false) }
  }

  const retryFailed = () => {
    if (status?.paymentStatus !== 'Failed') return
    attemptId.current = crypto.randomUUID(); submitted.current = false
    try { sessionStorage.removeItem(recoveryKey) } catch { /* Memory-only fallback. */ }
    setStatus(null); setPayment(null); setUncertain(false); setError('')
    if (!booking) onFinish()
  }
  const paid = status?.paymentStatus === 'Paid'
  const issued = paid && status?.ticketingStatus === 'Issued'
  const failed = status?.paymentStatus === 'Failed'
  const cancelled = status?.paymentStatus === 'Refunded'
  const finish = () => {
    try { sessionStorage.removeItem(recoveryKey) } catch { /* Memory-only fallback. */ }
    onFinish()
  }
  const emailHint = status?.emailStatus === 'Sent'
    ? (language === 'tr' ? 'Ödeme bilgilendirmesi iletişim e-posta adresine gönderildi.' : 'A payment confirmation was sent to your booking contact email.')
    : status?.emailStatus === 'Queued' || status?.emailStatus === 'Processing'
      ? (language === 'tr' ? 'Ödeme bilgilendirmesi iletişim e-posta adresin için gönderim sırasına alındı.' : 'A payment confirmation is queued for your booking contact email.')
      : status?.emailStatus === 'Failed' || status?.emailStatus === 'ReviewRequired'
        ? (language === 'tr' ? 'Mail gönderimi henüz doğrulanmadı. Sipariş kodunu sakla; destek ekibimiz kontrol edebilir.' : 'Email delivery has not been confirmed. Keep your order code so our team can check it.') : ''

  if (payment) return <section className="reservation-bank">
    <h3><LockKeyhole size={19} /> {c.bankTitle}</h3><p>{c.bankHint}</p>
    <p className="reservation-order-code">{c.code}: <strong>{payment.ticketCode}</strong></p>
    <iframe ref={iframe} title={c.bankTitle} src={`${apiBaseUrl}${payment.threeDSecureUrl}`} sandbox="allow-forms allow-scripts allow-same-origin" referrerPolicy="no-referrer" />
    <button type="button" className="reservation-back" disabled={checking} onClick={() => void readStatus()}><RefreshCw size={16} /> {c.check}</button>
  </section>
  if (status || uncertain) return <section className={`reservation-payment-result ${issued ? 'reservation-payment-result--success' : ''}`} role="status">
    {issued || cancelled ? <CheckCircle2 size={34} /> : failed ? <CircleAlert size={34} /> : <LoaderCircle size={34} className="reservation-spinner" />}
    <h3>{issued ? c.success : cancelled ? c.cancelled : paid ? c.paid : failed ? c.failed : c.uncertain}</h3>
    {!issued && <p>{cancelled ? c.cancelledHint : paid ? c.paidHint : failed ? c.failedHint : c.uncertainHint}</p>}
    {status && <p className="reservation-order-code">{c.code}<strong>{status.ticketCode}</strong></p>}
    {paid && emailHint && <p>{emailHint}</p>}
    {issued && <div className="reservation-issued-tickets">{status.tickets.map((ticket, index) => <div key={ticket.ticketGuid ?? index}><span>{index + 1}. {c.pnr}</span><strong>{ticket.pnr}</strong></div>)}</div>}
    {issued && <p>{language === 'tr' ? 'Yolculuğun için sipariş ve PNR kodlarını sakla.' : 'Keep your order and PNR codes for your trip.'}</p>}
    {(issued || cancelled) && <button type="button" className="button button--navy" onClick={finish}>{language === 'tr' ? 'Tamam, turlara dön' : 'Done, back to tours'}</button>}
    {failed ? <button type="button" className="button button--navy" onClick={retryFailed}>{c.retry}</button>
      : !issued && !cancelled && <><button type="button" className="reservation-back" disabled={checking} onClick={() => void readStatus()}><RefreshCw size={16} /> {checking ? c.confirming : c.check}</button><a className="reservation-back" href="mailto:merhaba@peremetours.com">{c.support}</a></>}
  </section>
  return booking ? <>{error && <p className="reservation-error" role="alert">{error}</p>}{!requiresReview && <BookingPaymentFields language={language} enabled={enabled} unavailable={!enabled} busy={starting} amount={booking.quote.amount} onPay={pay} />}</> : null
}
