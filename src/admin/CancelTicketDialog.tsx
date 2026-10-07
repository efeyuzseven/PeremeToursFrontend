import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../lib/api'
import type { AdminLanguage } from './AdminLayout'

type Booking = {
  id: string
  ticketCode: string
  tourName: string
  amount: number
  currency: string
  guestCount: number
}
type Result = {
  status: string
  failureCode?: string | null
  bankOperation?: string | null
  providerCancelled: boolean
  canRetry?: boolean
}

export default function CancelTicketDialog({
  ticket,
  token,
  language,
  onClose,
  onChanged,
}: {
  ticket: Booking
  token: string
  language: AdminLanguage
  onClose: () => void
  onChanged: () => void
}) {
  const tr = language === 'tr'
  const [reason, setReason] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState({ current: false })
  const hasStarted = useRef(false)
  const dialog = useRef<HTMLElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.focus()
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
      if (event.key === 'Tab') {
        const nodes = dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),textarea:not(:disabled),input:not(:disabled)',
        )
        if (!nodes?.length) {
          event.preventDefault()
          return
        }
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog.current)
        ) {
          event.preventDefault()
          last.focus()
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === dialog.current)
        ) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', keyboard)
    return () => {
      document.removeEventListener('keydown', keyboard)
      previous?.focus()
    }
  }, [busy, onClose])

  const submit = async () => {
    if (hasStarted.current || !accepted || !reason.trim()) return
    hasStarted.current = true
    setSubmitted({ current: true })
    setBusy(true)
    setError('')
    try {
      setResult(
        await apiRequest<Result>(`/api/v1/admin/tickets/${ticket.id}/cancel`, {
          token,
          method: 'POST',
          body: {
            ticketCode: ticket.ticketCode,
            expectedAmount: ticket.amount,
            reason: reason.trim(),
          },
          signal: AbortSignal.timeout(120_000),
        }),
      )
    } catch {
      setError(
        tr
          ? 'İptal sonucu doğrulanamadı. Tekrar iptal/iade başlatma; aşağıdaki butonla mevcut işlem durumunu kontrol et.'
          : 'The result could not be confirmed. Do not cancel or refund again; check the existing request below.',
      )
    } finally {
      setBusy(false)
      onChanged()
    }
  }
  const check = async () => {
    setBusy(true)
    setError('')
    try {
      setResult(
        await apiRequest<Result>(
          `/api/v1/admin/tickets/${ticket.id}/cancellation`,
          { token, cache: 'no-store' },
        ),
      )
    } catch {
      setError(
        tr
          ? 'İptal kaydı okunamadı. Listeyi yenileyip sipariş koduyla destek ekibine başvur.'
          : 'Could not read the cancellation record. Refresh the list and contact support with the booking reference.',
      )
    } finally {
      setBusy(false)
      onChanged()
    }
  }
  const completed = result?.status === 'Completed'
  const retry = () => {
    if (busy || !result?.canRetry) return
    hasStarted.current = false
    setSubmitted({ current: false })
    setAccepted(false)
    setResult(null)
    setError('')
  }
  return (
    <div
      className="admin-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <section
        ref={dialog}
        tabIndex={-1}
        className="admin-modal admin-cancel-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-title"
      >
        <button
          type="button"
          className="admin-modal__close"
          disabled={busy}
          onClick={onClose}
          aria-label={tr ? 'Kapat' : 'Close'}
        >
          <X />
        </button>
        <div className="admin-modal__heading">
          <span>
            <ShieldCheck />
          </span>
          <div>
            <h2 id="cancel-title">
              {tr ? 'Rezervasyonu iptal et' : 'Cancel booking'}
            </h2>
            <p>{ticket.ticketCode}</p>
          </div>
        </div>
        <div className="admin-cancel-summary">
          <strong>{ticket.tourName}</strong>
          <p>
            {ticket.guestCount}{' '}
            {tr ? 'yolcu · Tüm rezervasyon' : 'passengers · Entire booking'}
          </p>
          <b>
            {new Intl.NumberFormat(tr ? 'tr-TR' : 'en-GB', {
              style: 'currency',
              currency: ticket.currency,
            }).format(ticket.amount)}
          </b>
        </div>
        {!submitted.current && (
          <>
            <p className="admin-cancel-note">
              {tr
                ? 'Banka durumuna göre tahsilat iptali veya tam tutar iadesi yapılır ve rezervasyon kapatılır. Bilet iptali arka planda yürütülür. Kısmi yolcu/tutar iptali yapılmaz.'
                : 'The payment is voided or refunded in full based on bank status and the booking is closed. Ticket cancellation runs in the background. Partial passenger cancellations or refunds are not supported.'}
            </p>
            <label className="admin-cancel-reason">
              {tr ? 'İptal nedeni' : 'Reason'}
              <textarea
                rows={3}
                maxLength={300}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <label className="admin-cancel-consent">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              <span>
                {tr
                  ? 'Yukarıdaki rezervasyonun tamamını iptal etmeyi ve banka iptal/iade işlemini onaylıyorum.'
                  : 'I confirm cancellation of the entire booking and the bank reversal/refund.'}
              </span>
            </label>
            <button
              type="button"
              className="admin-primary-button"
              disabled={!accepted || !reason.trim() || busy}
              onClick={() => void submit()}
            >
              {tr ? 'İptali ve iadeyi onayla' : 'Confirm cancellation & refund'}
            </button>
          </>
        )}
        {busy && (
          <p role="status">
            {tr
              ? 'İşlem kontrol ediliyor… Bu pencereyi kapatma.'
              : 'Checking the request… Keep this window open.'}
          </p>
        )}
        {error && (
          <p className="admin-alert" role="alert">
            {error}
          </p>
        )}
        {result && (
          <div className="admin-cancel-result" role="status">
            {completed ? <CheckCircle2 /> : <AlertCircle />}
            <h3>
              {completed
                ? tr
                  ? 'İptal / iade onaylandı'
                  : 'Cancellation / reversal confirmed'
                : result.canRetry
                  ? tr
                    ? 'İptal / iade başlatılamadı'
                    : 'Cancellation / refund not started'
                  : tr
                    ? 'İptal / iade kontrol gerekli'
                    : 'Cancellation / refund needs review'}
            </h3>
            <p>
              {completed
                ? tr
                  ? 'Banka iptal/iade işlemini onayladı ve rezervasyon kapatıldı. Bankanın karta yansıtma süresi farklı olabilir.'
                  : 'The bank confirmed the reversal/refund and the booking is closed. Card statement timing depends on the bank.'
                : result.canRetry
                  ? tr
                    ? 'Banka iadesi henüz başlatılmadı. Yeniden onaylayarak banka iptal/iade işlemini tamamlayabilirsin.'
                    : 'No bank refund was started. You can confirm and complete the bank reversal/refund.'
                  : tr
                    ? 'Banka iptal/iade sonucu doğrulanamadı. Yeni iade başlatma; mevcut banka sonucunu kontrol et.'
                    : 'The bank reversal/refund could not be confirmed. Do not refund again; check the existing bank result.'}
            </p>
            {!completed && result.failureCode && (
              <code>{result.failureCode}</code>
            )}
          </div>
        )}
        {submitted.current && (
          <div className="admin-modal__actions">
            {result?.canRetry && (
              <button type="button" disabled={busy} onClick={retry}>
                {tr
                  ? 'İptal ve iadeyi yeniden dene'
                  : 'Retry cancellation & refund'}
              </button>
            )}
            {!completed && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void check()}
              >
                <RefreshCw size={16} />
                {tr
                  ? 'Mevcut iptal durumunu kontrol et'
                  : 'Check existing cancellation'}
              </button>
            )}
            <button type="button" disabled={busy} onClick={onClose}>
              {tr ? 'Tamam' : 'Done'}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
