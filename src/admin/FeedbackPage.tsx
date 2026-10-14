import { ChevronLeft, ChevronRight, Inbox, Mail, MessageSquare, RefreshCw, Search, Send, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError, apiRequest } from '../lib/api'
import { setPageMetadata } from '../lib/site'
import type { AdminLanguage } from './AdminLayout'
import './feedback.css'

type DeliveryStatus = 'Queued' | 'Processing' | 'Sent' | 'Failed' | 'ReviewRequired'
type FeedbackSummary = { id: string; name: string; email: string; topic: string; language: string; createdAtUtc: string; replyCount: number; latestReplyStatus: DeliveryStatus | null }
type Reply = { id: string; revision: number; body: string; createdAtUtc: string; status: DeliveryStatus; sentAtUtc: string | null; failureCode: string | null }
type FeedbackDetail = Omit<FeedbackSummary, 'replyCount' | 'latestReplyStatus'> & { message: string; replyRevision: number; replies: Reply[];
  notifications: { recipientEmail: string; status: DeliveryStatus; sentAtUtc: string | null; failureCode: string | null }[] }
type FeedbackPageData = { items: FeedbackSummary[]; totalCount: number; page: number; pageSize: number; totalRequests: number; unansweredRequests: number; answeredRequests: number; emailSendingEnabled: boolean }
type ReplyReceipt = { replyId: string; requestId: string; revision: number; status: DeliveryStatus }

const copy = {
  tr: { title: 'Geri Bildirimler', eyebrow: 'MÜŞTERİ İLETİŞİMİ', subtitle: 'İletişim formundan gelen mesajları inceleyin ve müşterilere e-posta ile yanıt verin.',
    total: 'Toplam mesaj', unanswered: 'Yanıt bekleyen', answered: 'Yanıt oluşturulan', search: 'Ad, e-posta veya konu ara…', searchButton: 'Ara', all: 'Tüm mesajlar',
    filter: 'Yanıt durumu', answeredFilter: 'Yanıt oluşturulanlar', refresh: 'Yenile', view: 'İncele ve yanıtla', empty: 'Bu filtrede mesaj bulunamadı.', error: 'Geri bildirimler yüklenemedi. Tekrar deneyin.',
    previous: 'Önceki sayfa', next: 'Sonraki sayfa', detail: 'Geri bildirim detayı', close: 'Kapat', message: 'Müşterinin mesajı', response: 'Yanıtınız', history: 'Yanıt geçmişi', noHistory: 'Henüz yanıt oluşturulmadı.',
    send: 'Yanıtı kaydet ve mail gönder', sending: 'Kaydediliyor…', hint: 'Yanıt, formdaki e-posta adresine mevcut Dentur mail hesabıyla gönderilir. Kart veya kimlik bilgisi istemeyin.',
    saved: 'Yanıt kaydedildi. Mailin gönderim durumunu yanıt geçmişinden takip edebilirsiniz.', failed: 'Yanıt kaydedilemedi. Taslağınız korunuyor; tekrar deneyin.',
    unknown: 'İşlem sonucu alınamadı; yanıt kaydedilmiş olabilir. Aynı yanıtla tekrar deneyerek sonucu kontrol edebilirsiniz.',
    conflict: 'Bu mesaja başka bir işlemde yanıt yazıldı. Detayı yenileyip son yanıtı kontrol edin; taslağınız korunuyor.',
    blocked: 'Önceki yanıtın gönderimi sürüyor veya kontrol bekliyor. Yeni mail oluşturulamaz.', expired: 'Yönetici oturumunuz geçerli değil. Yeniden giriş yapın.',
    rate: 'Kısa sürede çok fazla yanıt gönderildi. Bir dakika sonra tekrar deneyin.', disabled: 'Mail gönderimi kapalı. Yeni yanıt gönderilemez.',
    review: 'Gönderim sonucu belirsiz. SMTP kaydı kontrol edilmeden yeniden mail gönderilmez.', deliveryFailed: 'Mail gönderilemedi. Mail ayarlarını kontrol edip gerekirse yeni gönderim başlatabilirsiniz.',
    leave: 'Kaydedilmemiş bir yanıtınız var. Pencereyi kapatmak istiyor musunuz?', notifications: 'İç ekip bildirimleri', requestLanguage: 'Mesaj dili',
    statuses: { Queued: 'Mail kuyrukta', Processing: 'Mail gönderiliyor', Sent: 'Mail gönderildi', Failed: 'Mail gönderilemedi', ReviewRequired: 'Kontrol gerekli' }, waiting: 'Yanıt bekliyor' },
  en: { title: 'Feedback', eyebrow: 'CUSTOMER COMMUNICATION', subtitle: 'Review contact form messages and respond to customers by email.',
    total: 'Total messages', unanswered: 'Awaiting response', answered: 'Responses created', search: 'Search name, email or subject…', searchButton: 'Search', all: 'All messages',
    filter: 'Response status', answeredFilter: 'Response created', refresh: 'Refresh', view: 'View and respond', empty: 'No messages match this filter.', error: 'Could not load feedback. Please try again.',
    previous: 'Previous page', next: 'Next page', detail: 'Feedback details', close: 'Close', message: 'Customer message', response: 'Your response', history: 'Response history', noHistory: 'No response has been created yet.',
    send: 'Save response and send email', sending: 'Saving…', hint: 'Your response is emailed to the original contact address using the existing Dentur mail account. Do not request card or identity details.',
    saved: 'Response saved. Follow email delivery status in the response history.', failed: 'Could not save your response. Your draft is retained; please try again.',
    unknown: 'The request result is unknown; your response may have been saved. Retry the same response to check the result.',
    conflict: 'Another request responded to this message. Refresh the details and review the latest response; your draft is retained.',
    blocked: 'The previous response is still being delivered or requires review. A new email cannot be created.', expired: 'Your administrator session is not valid. Sign in again.',
    rate: 'Too many responses have been submitted. Please try again in one minute.', disabled: 'Email delivery is disabled. New responses cannot be sent.',
    review: 'Delivery is uncertain. SMTP logs must be checked before sending again.', deliveryFailed: 'Email delivery failed. Check mail settings before starting a new send if needed.',
    leave: 'You have an unsaved response. Close this window?', notifications: 'Internal team notifications', requestLanguage: 'Message language',
    statuses: { Queued: 'Email queued', Processing: 'Email sending', Sent: 'Email sent', Failed: 'Email failed', ReviewRequired: 'Review required' }, waiting: 'Awaiting response' },
}
const pending = (status?: DeliveryStatus | null) => status === 'Queued' || status === 'Processing'
const formatDate = (value: string, language: AdminLanguage) => new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul' }).format(new Date(value))

function FeedbackDialog({ id, token, language, mailEnabled, onClose, onSaved, returnFocus }: { id: string; token: string; language: AdminLanguage; mailEnabled: boolean;
  onClose: () => void; onSaved: () => void; returnFocus: React.RefObject<HTMLElement | null> }) {
  const c = copy[language]
  const [detail, setDetail] = useState<FeedbackDetail | null>(null)
  const [body, setBody] = useState('')
  const [loadError, setLoadError] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState<ReplyReceipt | null>(null)
  const [pollTick, setPollTick] = useState(0)
  const operation = useRef<{ body: string; replyId: string; expectedRevision: number } | null>(null)
  const submitting = useRef(false)
  const hasDraft = useRef(false)
  const dialog = useRef<HTMLElement>(null)
  const closeRef = useRef(() => {})
  const latest = detail?.replies.at(-1)
  const status = latest && (!receipt || latest.revision >= receipt.revision) ? latest.status : receipt?.status
  const blocked = pending(status) || status === 'ReviewRequired'
  useEffect(() => { closeRef.current = () => { if (!submitting.current && (!body.trim() || window.confirm(c.leave))) onClose() } }, [body, c.leave, onClose])
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await apiRequest<FeedbackDetail>(`/api/v1/admin/feedback/${id}`, { token, cache: 'no-store', signal })
      if (signal?.aborted) return
      setDetail(result); setLoadError(false)
      setReceipt(current => { const delivered = result.replies.find(reply => reply.id === current?.replyId); return current && delivered ? { ...current, status: delivered.status } : current })
    } catch { if (!signal?.aborted) setLoadError(true) }
    finally { if (!signal?.aborted) setPollTick(value => value + 1) }
  }, [id, token])
  useEffect(() => {
    const controller = new AbortController(); const timer = setTimeout(() => void load(controller.signal), 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [load])
  useEffect(() => {
    if (!pending(status)) return
    const controller = new AbortController(); const timer = setTimeout(() => void load(controller.signal), 5000)
    return () => { clearTimeout(timer); controller.abort() }
  }, [status, pollTick, load])
  useEffect(() => {
    const previous = returnFocus.current ?? document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    const root = document.getElementById('root'); const wasInert = root?.inert ?? false
    document.body.style.overflow = 'hidden'; if (root) root.inert = true
    dialog.current?.focus()
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current() }
      if (event.key !== 'Tab') return
      const nodes = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),textarea:not(:disabled),a[href]') ?? [])].filter(node => node.getClientRects().length)
      if (!nodes.length) { event.preventDefault(); dialog.current?.focus(); return }
      const first = nodes[0], last = nodes.at(-1)!
      if (event.shiftKey && (document.activeElement === first || !dialog.current?.contains(document.activeElement))) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.current?.contains(document.activeElement))) { event.preventDefault(); first.focus() }
    }
    const beforeUnload = (event: BeforeUnloadEvent) => { if (submitting.current || hasDraft.current) { event.preventDefault(); event.returnValue = '' } }
    document.addEventListener('keydown', keyboard); window.addEventListener('beforeunload', beforeUnload)
    return () => {
      document.removeEventListener('keydown', keyboard); window.removeEventListener('beforeunload', beforeUnload)
      document.body.style.overflow = overflow; if (root) root.inert = wasInert
      requestAnimationFrame(() => { if (previous?.isConnected) previous.focus(); else document.querySelector<HTMLElement>('.admin-page-heading button')?.focus() })
    }
  }, [returnFocus])
  const send = async (event: FormEvent) => {
    event.preventDefault()
    if (!detail || submitting.current || blocked || !mailEnabled || !body.trim()) return
    const normalized = body.trim()
    if (operation.current?.body !== normalized) operation.current = { body: normalized, replyId: crypto.randomUUID(), expectedRevision: detail.replyRevision }
    const attempt = operation.current
    submitting.current = true; setBusy(true); setError(''); setSuccess(false)
    try {
      const result = await apiRequest<ReplyReceipt>(`/api/v1/admin/feedback/${id}/replies`, { method: 'POST', token,
        body: { replyId: attempt.replyId, expectedRevision: attempt.expectedRevision, body: attempt.body }, signal: AbortSignal.timeout(20_000) })
      setReceipt(result); setSuccess(true); setBody(''); hasDraft.current = false; operation.current = null; onSaved()
      await load()
    } catch (caught) {
      const api = caught instanceof ApiError ? caught : null
      setError(api?.code === 'FEEDBACK_REPLY_CONFLICT' ? c.conflict : api?.code === 'FEEDBACK_REPLY_PENDING' ? c.blocked
        : api?.status === 401 || api?.status === 403 ? c.expired : api?.status === 429 ? c.rate
          : api?.code === 'CONTACT_MAIL_UNAVAILABLE' ? c.disabled : api?.status === 0 ? c.unknown : c.failed)
      if (api?.status === 409) { operation.current = null; await load() }
    } finally { submitting.current = false; setBusy(false) }
  }
  return createPortal(<div className="admin-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeRef.current() }}>
    <section ref={dialog} tabIndex={-1} className="admin-modal feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-detail-title">
      <button type="button" className="admin-modal__close" aria-label={c.close} disabled={busy} onClick={() => closeRef.current()}><X /></button>
      <div className="admin-modal__heading"><span><MessageSquare size={20} /></span><div><h2 id="feedback-detail-title">{c.detail}</h2><p>{detail?.topic}</p></div></div>
      {loadError && <div className="admin-alert" role="alert">{c.error}</div>}
      <button className="feedback-refresh" type="button" disabled={busy} onClick={() => void load()}><RefreshCw size={15} />{c.refresh}</button>
      {!detail && !loadError && <div className="site-content-loading"><span className="button-spinner" /></div>}
      {detail && <>
        <div className="feedback-person"><strong>{detail.name}</strong><span>{detail.email}</span><small>{formatDate(detail.createdAtUtc, language)} · {c.requestLanguage}: {detail.language.toUpperCase()}</small></div>
        <h3>{c.message}</h3><div className="feedback-message">{detail.message}</div>
        {detail.notifications.length > 0 && <details className="feedback-notifications"><summary>{c.notifications}</summary>{detail.notifications.map(item => <p key={item.recipientEmail}>{item.recipientEmail} <span>{c.statuses[item.status]}</span></p>)}</details>}
        <h3>{c.history}</h3>
        {detail.replies.length === 0 && <p className="feedback-hint">{c.noHistory}</p>}
        <div className="feedback-history">{detail.replies.map(reply => <article key={reply.id}><header><strong>#{reply.revision}</strong><time>{formatDate(reply.createdAtUtc, language)}</time><span className={`feedback-status feedback-status--${reply.status}`}>{c.statuses[reply.status]}</span></header><p>{reply.body}</p>{reply.sentAtUtc && <small>{c.statuses.Sent}: {formatDate(reply.sentAtUtc, language)}</small>}{reply.status === 'Failed' && <small>{c.deliveryFailed}</small>}{reply.status === 'ReviewRequired' && <small>{c.review}</small>}</article>)}</div>
        {success && <div className="admin-alert site-content-success" role="status">{c.saved}</div>}
        {error && <div className="admin-alert" role="alert">{error}</div>}
        {!mailEnabled && <div className="admin-alert">{c.disabled}</div>}
        {blocked && <p className="feedback-hint" role="status">{status === 'ReviewRequired' ? c.review : c.blocked}</p>}
        <form onSubmit={event => void send(event)} aria-busy={busy}>
          <label className="field-wide">{c.response}<textarea aria-label={c.response} rows={6} maxLength={6000} required value={body} disabled={busy || !mailEnabled} onChange={event => { setBody(event.target.value); hasDraft.current = Boolean(event.target.value.trim()); setSuccess(false) }} /></label>
          <p className="feedback-hint field-wide">{c.hint}</p>
          <div className="admin-modal__actions field-wide"><button type="button" disabled={busy} onClick={() => closeRef.current()}>{c.close}</button><button className="admin-primary-button" type="submit" disabled={busy || blocked || !mailEnabled || !body.trim()}><Send size={16} />{busy ? c.sending : c.send}</button></div>
        </form>
      </>}
    </section>
  </div>, document.body)
}

export default function FeedbackPage() {
  const { language } = useOutletContext<{ language: AdminLanguage }>()
  const { session } = useAuth()
  const c = copy[language]
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [data, setData] = useState<FeedbackPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const reload = useCallback(() => setRefresh(value => value + 1), [])
  const close = useCallback(() => setSelectedId(null), [])
  useEffect(() => { setPageMetadata({ title: c.title, language, indexable: false }) }, [c.title, language])
  useEffect(() => {
    // New contact requests appear while this page is open; an active reply draft is never reset.
    const timer = setInterval(() => { if (!selectedId && document.visibilityState === 'visible') reload() }, 30_000)
    return () => clearInterval(timer)
  }, [selectedId, reload])
  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ page: String(page), pageSize: '20' })
    if (query) params.set('search', query); if (filter) params.set('filter', filter)
    apiRequest<FeedbackPageData>(`/api/v1/admin/feedback?${params}`, { token: session?.accessToken, cache: 'no-store', signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) { setData(result); setError(false) } })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [session?.accessToken, page, query, filter, refresh])
  const submitSearch = (event: FormEvent) => { event.preventDefault(); setPage(1); setQuery(search.trim()); setLoading(true); reload() }
  const pages = Math.max(1, Math.ceil((data?.totalCount ?? 0) / 20))
  return <>
    <div className="admin-page-heading"><div><span>{c.eyebrow}</span><h1>{c.title}</h1><p>{c.subtitle}</p></div><button className="admin-primary-button" onClick={() => { setLoading(true); reload() }} disabled={loading}><RefreshCw size={16} />{c.refresh}</button></div>
    <div className="admin-stat-grid feedback-stats">{[[c.total, data?.totalRequests], [c.unanswered, data?.unansweredRequests], [c.answered, data?.answeredRequests]].map(([label, count], index) => <article key={index}><span className="admin-stat-icon">{index === 0 ? <Inbox /> : index === 1 ? <MessageSquare /> : <Mail />}</span><div><small>{label}</small><strong>{count ?? '—'}</strong></div></article>)}</div>
    {error && <div className="admin-alert" role="alert">{c.error}</div>}
    {data && !data.emailSendingEnabled && <div className="admin-alert">{c.disabled}</div>}
    <div className="admin-table-card feedback-panel">
      <form className="feedback-tools" onSubmit={submitSearch}><label><Search size={16} /><input aria-label={c.search} placeholder={c.search} maxLength={160} value={search} onChange={event => setSearch(event.target.value)} /></label><button type="submit">{c.searchButton}</button><select aria-label={c.filter} value={filter} onChange={event => { setFilter(event.target.value); setPage(1); setLoading(true) }}><option value="">{c.all}</option><option value="Unanswered">{c.unanswered}</option><option value="Answered">{c.answeredFilter}</option></select></form>
      {loading ? <div className="site-content-loading"><span className="button-spinner" /></div> : !error && data?.items.length === 0 ? <div className="admin-empty"><Inbox /><p>{c.empty}</p></div> : !error && <div className="feedback-list">{data?.items.map(item => <article key={item.id} data-feedback-id={item.id}>
        <div className="feedback-sender"><strong>{item.name}</strong><small>{item.email}</small></div><div className="feedback-topic"><h2>{item.topic}</h2><time>{formatDate(item.createdAtUtc, language)}</time></div><span className="feedback-language">{item.language.toUpperCase()}</span><span className={`feedback-status feedback-status--${item.latestReplyStatus ?? 'New'}`}>{item.latestReplyStatus ? c.statuses[item.latestReplyStatus] : c.waiting}</span>
        <button type="button" onClick={event => { returnFocus.current = event.currentTarget; setSelectedId(item.id) }}><MessageSquare size={15} />{c.view}</button>
      </article>)}</div>}
      <div className="feedback-pagination"><span>{data?.totalCount ?? 0} · {page} / {pages}</span><div><button type="button" aria-label={c.previous} disabled={loading || error || page <= 1} onClick={() => { setPage(value => value - 1); setLoading(true) }}><ChevronLeft /></button><button type="button" aria-label={c.next} disabled={loading || error || page >= pages} onClick={() => { setPage(value => value + 1); setLoading(true) }}><ChevronRight /></button></div></div>
    </div>
    {selectedId && <FeedbackDialog key={selectedId} id={selectedId} token={session!.accessToken} language={language} mailEnabled={data?.emailSendingEnabled ?? false} onClose={close} onSaved={reload} returnFocus={returnFocus} />}
  </>
}
