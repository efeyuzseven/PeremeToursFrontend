import { AlertCircle, ArrowLeft, ArrowRight, Banknote, Mail, RefreshCw, Search, ShieldCheck, TicketCheck } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiRequest } from '../lib/api'
import { setPageMetadata } from '../lib/site'
import type { AdminLanguage } from './AdminLayout'

type Stage = 'Payment' | 'Ticketing' | 'Email' | 'Cancellation'
type ErrorEntry = {
  id: string; ticketId: string; ticketCode: string; tourName: string; tourDate: string
  amount: number; currency: string; stage: Stage; code: string; providerCode?: string
  message: string; isHistorical: boolean; createdAtUtc: string
  paymentStatus: string; ticketingStatus: string; emailStatus?: string
}
type ErrorPage = { items: ErrorEntry[]; totalCount: number; page: number; pageSize: number; emailSendingEnabled?: boolean }
const copy = {
  tr: { eyebrow: 'OPERASYON & GÜVENLİK', title: 'Bilet Hata Kayıtları', subtitle: 'Ödeme, bilet kesimi ve e-posta gönderim sorunlarını tek yerden takip edin.', refresh: 'Yenile', all: 'Tümü', Payment: 'Ödeme', Ticketing: 'Bilet kesimi', Email: 'E-posta', search: 'Rezervasyon, tur veya hata kodu ara', find: 'Ara', empty: 'Bu filtrede hata kaydı bulunmuyor.', loading: 'Hata kayıtları yükleniyor…', error: 'Hata kayıtları yüklenemedi. Lütfen tekrar deneyin.', safety: 'Bu ekran yeni tahsilat başlatmaz. Belirsiz ödeme veya bilet sonucunda önce banka / EasyTicket kaydını kontrol edin.', history: 'Geçmiş kayıt', historyNote: 'Geçmiş işlemden aktarıldı. Orijinal sağlayıcı hata açıklaması mevcut olmayabilir.', records: 'kayıt', previous: 'Önceki sayfa', next: 'Sonraki sayfa', payment: 'Ödeme', ticket: 'Bilet', email: 'Mail', noMail: 'Kuyruk kaydı yok' },
  en: { eyebrow: 'OPERATIONS & SECURITY', title: 'Ticket Error Logs', subtitle: 'Track payment, ticket issuance and email delivery issues in one place.', refresh: 'Refresh', all: 'All', Payment: 'Payment', Ticketing: 'Ticket issuance', Email: 'Email', search: 'Search booking, tour or error code', find: 'Search', empty: 'No error records match this filter.', loading: 'Loading error records…', error: 'Error records could not be loaded. Please try again.', safety: 'This screen never charges a customer. Review bank / EasyTicket records before acting on an uncertain payment or ticket result.', history: 'Historical record', historyNote: 'Imported from a previous transaction. The original provider error message may not be available.', records: 'records', previous: 'Previous page', next: 'Next page', payment: 'Payment', ticket: 'Ticket', email: 'Email', noMail: 'No queue entry' },
}
const states: Record<AdminLanguage, Record<string, string>> = {
  tr: { NotRequired: 'Manuel', Pending: 'Bekliyor', Processing: 'İşleniyor', Paid: 'Ödendi', Failed: 'Başarısız', Refunded: 'İade edildi', ReviewRequired: 'Kontrol gerekli', Issued: 'Hazır', Queued: 'Kuyrukta', Sent: 'Gönderildi' },
  en: { NotRequired: 'Manual', Pending: 'Pending', Processing: 'Processing', Paid: 'Paid', Failed: 'Failed', Refunded: 'Refunded', ReviewRequired: 'Review required', Issued: 'Issued', Queued: 'Queued', Sent: 'Sent' },
}
const englishDetails: Record<string, string> = {
  GATEWAY_START_FAILED: 'Bank verification could not be started. No authorization was submitted at this stage.',
  CALLBACK_VALIDATION_FAILED: '3D Secure callback validation failed. Check the bank record before attempting payment again.',
  BANK_RESULT_UNKNOWN: 'The bank result is uncertain. Do not charge again; review the order in the bank portal.',
  PROVIDER_RESULT_UNKNOWN: 'Payment was received, but ticket issuance is uncertain. Review the EasyTicket record; do not charge again.',
  PROVIDER_RESULT_INCOMPLETE: 'Payment was received, but not all issued tickets could be verified. Review the EasyTicket record.',
  SMTP_TLS_FAILED: 'The mail server TLS connection could not be verified. Check its certificate; certificate validation remains enabled.',
  SMTP_AUTH_FAILED: 'The mail server rejected authentication. Check the SMTP account.',
  SMTP_CONFIG_MISSING: 'Mail configuration is incomplete. Delivery was not started.',
  SMTP_CONNECT_FAILED: 'The mail server connection could not be completed. Delivery will be retried within the retry limit.',
  SMTP_SEND_REJECTED: 'The mail server rejected delivery. Check the recipient address and SMTP sending permissions.',
  SMTP_RESULT_UNKNOWN: 'The delivery result is uncertain. Check SMTP logs before sending again.',
  EMAIL_ADDRESS_INVALID: 'The booking contact email address is invalid.',
}

export default function TicketErrorsPage() {
  const { language } = useOutletContext<{ language: AdminLanguage }>()
  const { session } = useAuth()
  const c = copy[language]
  const [stage, setStage] = useState<Stage | 'All'>('All')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [data, setData] = useState<ErrorPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  useEffect(() => { setPageMetadata({ title: c.title, language, indexable: false }) }, [c.title, language])
  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ page: String(page), pageSize: '20' })
    if (stage !== 'All') params.set('stage', stage)
    if (query) params.set('search', query)
    void apiRequest<ErrorPage>(`/api/v1/admin/ticket-errors?${params}`, { token: session?.accessToken, signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setData(result) })
      .catch(() => { if (!controller.signal.aborted) { setData(null); setFailed(true) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [session?.accessToken, stage, query, page, refresh])

  const reload = () => { setLoading(true); setFailed(false); setRefresh((value) => value + 1) }
  const submitSearch = (event: FormEvent) => { event.preventDefault(); setPage(1); setQuery(search.trim()); reload() }
  const dateTime = (date: string) => new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-GB', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul',
  }).format(new Date(date))
  const icon = (value: Stage) => value === 'Payment' ? <Banknote size={16} /> : value === 'Ticketing' ? <TicketCheck size={16} /> : value === 'Cancellation' ? <AlertCircle size={16} /> : <Mail size={16} />
  const detail = (entry: ErrorEntry) => language === 'tr' ? entry.message
    : entry.providerCode === 'CORE-2201' ? 'The bank API user could not be authenticated. Check user approval, permissions and credentials in the bank portal.'
      : englishDetails[entry.code] ?? 'The bank did not approve this payment. Check the detailed response using the booking reference in the bank portal.'

  return <>
    <div className="admin-page-heading"><div><span>{c.eyebrow}</span><h1>{c.title}</h1><p>{c.subtitle}</p></div>
      <button className="admin-primary-button" disabled={loading} onClick={reload}><RefreshCw size={16} />{c.refresh}</button></div>
    <div className="ticket-error-safety"><ShieldCheck size={21} /><p>{c.safety}</p></div>
    {data?.emailSendingEnabled === false && <div className="ticket-error-safety" role="status"><Mail size={21} /><p>{language === 'tr' ? 'Otomatik mail gönderimi şu an beklemede. Yeni başarılı ödemelerin mailleri güvenli gönderim etkinleştirilene kadar kalıcı kuyrukta tutulur.' : 'Automatic email delivery is currently paused. Emails for new successful payments remain in the durable queue until secure delivery is enabled.'}</p></div>}
    <section className="ticket-errors-panel" aria-busy={loading}>
      <div className="ticket-error-toolbar">
        <div className="ticket-error-filters" role="group" aria-label={language === 'tr' ? 'Hata aşaması' : 'Error stage'}>
          {(['All', 'Payment', 'Ticketing', 'Email', 'Cancellation'] as const).map((value) => <button key={value} aria-pressed={stage === value} onClick={() => { setStage(value); setPage(1); reload() }}>{value !== 'All' && icon(value)}{value === 'All' ? c.all : value === 'Cancellation' ? (language === 'tr' ? 'İptal / iade' : 'Cancellation / refund') : c[value]}</button>)}
        </div>
        <form className="ticket-error-search" onSubmit={submitSearch}><Search size={17} /><input aria-label={c.search} placeholder={c.search} maxLength={160} value={search} onChange={(event) => setSearch(event.target.value)} /><button type="submit">{c.find}</button></form>
      </div>
      {loading ? <div className="admin-empty" role="status"><span className="button-spinner" /><p>{c.loading}</p></div>
        : failed ? <div className="admin-empty" role="alert"><AlertCircle /><p>{c.error}</p><button className="admin-primary-button" onClick={reload}>{c.refresh}</button></div>
          : data?.items.length === 0 ? <div className="admin-empty"><ShieldCheck /><p>{c.empty}</p></div>
            : <div className="ticket-error-list">{data?.items.map((entry) => <article className="ticket-error-card" key={entry.id}>
              <header><span className="ticket-error-stage">{icon(entry.stage)}{entry.stage === 'Cancellation' ? (language === 'tr' ? 'İptal / iade' : 'Cancellation / refund') : c[entry.stage]}</span><time dateTime={entry.createdAtUtc}>{dateTime(entry.createdAtUtc)} · İstanbul</time></header>
              <div className="ticket-error-card__main"><div><strong>{entry.ticketCode}</strong><p>{entry.tourName} · {new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-GB', { dateStyle: 'medium' }).format(new Date(`${entry.tourDate}T12:00:00`))}</p></div>
                <span>{new Intl.NumberFormat(language === 'tr' ? 'tr-TR' : 'en-GB', { style: 'currency', currency: entry.currency }).format(entry.amount)}</span></div>
              <div className="ticket-error-codes"><code>{entry.code}</code>{entry.providerCode && <code>{entry.providerCode}</code>}{entry.isHistorical && <span>{c.history}</span>}</div>
              <p className="ticket-error-detail">{detail(entry)}</p>
              {entry.isHistorical && <p className="ticket-error-history">{c.historyNote}</p>}
              <footer><span>{c.payment}: <strong>{states[language][entry.paymentStatus] ?? entry.paymentStatus}</strong></span><span>{c.ticket}: <strong>{states[language][entry.ticketingStatus] ?? entry.ticketingStatus}</strong></span><span>{c.email}: <strong>{entry.emailStatus ? states[language][entry.emailStatus] ?? entry.emailStatus : c.noMail}</strong></span></footer>
            </article>)}</div>}
      {!loading && !failed && data && data.totalCount > 0 && <div className="ticket-error-pagination"><span>{data.totalCount} {c.records} · {page} / {Math.max(1, Math.ceil(data.totalCount / data.pageSize))}</span><div><button aria-label={c.previous} disabled={page === 1} onClick={() => { setPage((value) => value - 1); reload() }}><ArrowLeft size={16} /></button><button aria-label={c.next} disabled={page * data.pageSize >= data.totalCount} onClick={() => { setPage((value) => value + 1); reload() }}><ArrowRight size={16} /></button></div></div>}
    </section>
  </>
}
