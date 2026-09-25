import { CalendarDays, CheckCircle2, CircleDollarSign, Clock3, Plus, Search, TicketCheck, UsersRound, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiRequest, ApiError } from '../lib/api'
import type { AdminLanguage } from './AdminLayout'

type TicketStatus = 'Pending' | 'Confirmed' | 'Cancelled' | 'Used'
type TicketChannel = 'Web' | 'Admin'
type TicketPaymentStatus = 'NotRequired' | 'Pending' | 'Processing' | 'Paid' | 'Failed' | 'Refunded'
type TourTicket = {
  id: string; ticketCode: string; tourName: string; tourDate: string; departureTime: string
  customerName: string; customerEmail: string; guestCount: number; amount: number; currency: string
  status: TicketStatus; channel: TicketChannel; paymentStatus?: TicketPaymentStatus; createdAtUtc: string; updatedAtUtc: string
}
type CatalogTour = {
  externalTourId: number
  categoryName: string
  name: string
}

const pageCopy = {
  tr: { eyebrow: 'SATIŞ & REZERVASYON', title: 'Tur Biletleri', subtitle: 'Tüm tur satışlarını, yolcu bilgilerini ve bilet durumlarını yönetin.', create: 'Yeni bilet', total: 'Toplam bilet', revenue: 'Onaylı ciro', pending: 'Bekleyen', guests: 'Toplam misafir', search: 'Bilet, tur veya müşteri ara...', all: 'Tüm durumlar', code: 'Bilet', customer: 'Müşteri', tour: 'Tur & tarih', count: 'Kişi', amount: 'Tutar', channel: 'Kanal', payment: 'Ödeme', status: 'Durum', empty: 'Aramanızla eşleşen bilet bulunamadı.', modalTitle: 'Yeni tur bileti', modalText: 'Manuel satış veya rezervasyon ekleyin.', tourName: 'Tur adı', date: 'Tur tarihi', time: 'Kalkış saati', name: 'Müşteri adı', email: 'Müşteri e-postası', guestCount: 'Misafir sayısı', save: 'Bileti oluştur', cancel: 'Vazgeç', web: 'Web sitesi', admin: 'Yönetici', error: 'Biletler yüklenemedi.' },
  en: { eyebrow: 'SALES & BOOKINGS', title: 'Tour Tickets', subtitle: 'Manage tour sales, passenger details and every ticket status.', create: 'New ticket', total: 'Total tickets', revenue: 'Confirmed revenue', pending: 'Pending', guests: 'Total guests', search: 'Search ticket, tour or customer...', all: 'All statuses', code: 'Ticket', customer: 'Customer', tour: 'Tour & date', count: 'Guests', amount: 'Amount', channel: 'Channel', payment: 'Payment', status: 'Status', empty: 'No tickets matched your search.', modalTitle: 'New tour ticket', modalText: 'Add a manual sale or reservation.', tourName: 'Tour name', date: 'Tour date', time: 'Departure time', name: 'Customer name', email: 'Customer email', guestCount: 'Guest count', save: 'Create ticket', cancel: 'Cancel', web: 'Website', admin: 'Admin', error: 'Tickets could not be loaded.' },
}

const statusCopy: Record<AdminLanguage, Record<TicketStatus, string>> = {
  tr: { Pending: 'Bekliyor', Confirmed: 'Onaylandı', Cancelled: 'İptal', Used: 'Kullanıldı' },
  en: { Pending: 'Pending', Confirmed: 'Confirmed', Cancelled: 'Cancelled', Used: 'Used' },
}

const paymentStatusCopy: Record<AdminLanguage, Record<TicketPaymentStatus, string>> = {
  tr: { NotRequired: 'Manuel', Pending: 'Bekliyor', Processing: 'İşleniyor', Paid: 'Ödendi', Failed: 'Başarısız', Refunded: 'İade edildi' },
  en: { NotRequired: 'Manual', Pending: 'Pending', Processing: 'Processing', Paid: 'Paid', Failed: 'Failed', Refunded: 'Refunded' },
}

export default function TicketsPage() {
  const { language } = useOutletContext<{ language: AdminLanguage }>()
  const { session } = useAuth()
  const [tickets, setTickets] = useState<TourTicket[]>([])
  const [catalogTours, setCatalogTours] = useState<CatalogTour[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'All' | TicketStatus>('All')
  const [createOpen, setCreateOpen] = useState(false)
  const c = pageCopy[language]

  useEffect(() => {
    document.title = `${c.title} — PeremeTours`
  }, [c.title])

  useEffect(() => {
    let active = true
    apiRequest<TourTicket[]>('/api/v1/admin/tickets', { token: session!.accessToken })
      .then((result) => { if (active) setTickets(result) })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.message : c.error) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [c.error, session])

  useEffect(() => {
    const controller = new AbortController()
    apiRequest<CatalogTour[]>('/api/v1/tours', { signal: controller.signal })
      .then((result) => setCatalogTours(result))
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  const visibleTickets = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(language === 'tr' ? 'tr-TR' : 'en-US')
    return tickets.filter((ticket) => {
      const matchesStatus = filter === 'All' || ticket.status === filter
      const matchesQuery = !normalized || [ticket.ticketCode, ticket.tourName, ticket.customerName, ticket.customerEmail]
        .some((value) => value.toLocaleLowerCase(language === 'tr' ? 'tr-TR' : 'en-US').includes(normalized))
      return matchesStatus && matchesQuery
    })
  }, [filter, language, query, tickets])

  const confirmedRevenue = tickets
    .filter((ticket) => (ticket.status === 'Confirmed' || ticket.status === 'Used') && (!ticket.paymentStatus || ticket.paymentStatus === 'Paid' || ticket.paymentStatus === 'NotRequired'))
    .reduce((sum, ticket) => sum + ticket.amount, 0)
  const formatMoney = (amount: number) => new Intl.NumberFormat(language === 'tr' ? 'tr-TR' : 'en-US', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount)
  const formatDate = (date: string) => new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`))

  const changeStatus = async (ticket: TourTicket, status: TicketStatus) => {
    setError('')
    try {
      const updated = await apiRequest<TourTicket>(`/api/v1/admin/tickets/${ticket.id}`, { method: 'PATCH', token: session!.accessToken, body: { status } })
      setTickets((items) => items.map((item) => item.id === updated.id ? updated : item))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : c.error)
    }
  }

  const createTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const data = new FormData(event.currentTarget)
    try {
      const ticket = await apiRequest<TourTicket>('/api/v1/admin/tickets', {
        method: 'POST', token: session!.accessToken,
        body: { tourName: data.get('tourName'), tourDate: data.get('tourDate'), departureTime: data.get('departureTime'), customerName: data.get('customerName'), customerEmail: data.get('customerEmail'), guestCount: Number(data.get('guestCount')), amount: Number(data.get('amount')), status: 'Confirmed', channel: 'Admin' },
      })
      setTickets((items) => [ticket, ...items])
      setCreateOpen(false)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : c.error)
    } finally {
      setSaving(false)
    }
  }

  return <>
    <div className="admin-page-heading"><div><span>{c.eyebrow}</span><h1>{c.title}</h1><p>{c.subtitle}</p></div><button className="admin-primary-button" onClick={() => setCreateOpen(true)}><Plus /> {c.create}</button></div>
    <div className="admin-stat-grid">
      <article><span className="stat-icon stat-icon--blue"><TicketCheck /></span><div><small>{c.total}</small><strong>{tickets.length}</strong></div></article>
      <article><span className="stat-icon stat-icon--green"><CircleDollarSign /></span><div><small>{c.revenue}</small><strong>{formatMoney(confirmedRevenue)}</strong></div></article>
      <article><span className="stat-icon stat-icon--orange"><Clock3 /></span><div><small>{c.pending}</small><strong>{tickets.filter((ticket) => ticket.status === 'Pending').length}</strong></div></article>
      <article><span className="stat-icon stat-icon--violet"><UsersRound /></span><div><small>{c.guests}</small><strong>{tickets.reduce((sum, ticket) => sum + ticket.guestCount, 0)}</strong></div></article>
    </div>
    {error && <div className="admin-alert">{error}</div>}
    <section className="admin-table-card">
      <div className="admin-table-tools"><label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.search} /></label><select value={filter} onChange={(event) => setFilter(event.target.value as 'All' | TicketStatus)}><option value="All">{c.all}</option>{(['Pending', 'Confirmed', 'Cancelled', 'Used'] as TicketStatus[]).map((status) => <option key={status} value={status}>{statusCopy[language][status]}</option>)}</select></div>
      <div className="admin-table-scroll"><table><thead><tr><th>{c.code}</th><th>{c.customer}</th><th>{c.tour}</th><th>{c.count}</th><th>{c.amount}</th><th>{c.channel}</th><th>{c.payment}</th><th>{c.status}</th></tr></thead><tbody>
        {loading && Array.from({ length: 4 }).map((_, index) => <tr className="table-skeleton" key={index}><td colSpan={8}><span /></td></tr>)}
        {!loading && visibleTickets.map((ticket) => { const paymentStatus = ticket.paymentStatus ?? 'NotRequired'; return <tr key={ticket.id}><td><strong className="ticket-code">{ticket.ticketCode}</strong></td><td><div className="table-person"><span>{ticket.customerName.slice(0, 1)}</span><div><strong>{ticket.customerName}</strong><small>{ticket.customerEmail}</small></div></div></td><td><div className="table-tour"><strong>{ticket.tourName}</strong><small><CalendarDays /> {formatDate(ticket.tourDate)} · {ticket.departureTime.slice(0, 5)}</small></div></td><td>{ticket.guestCount}</td><td><strong>{formatMoney(ticket.amount)}</strong></td><td><span className="channel-pill">{ticket.channel === 'Web' ? c.web : c.admin}</span></td><td><span className={`payment-pill payment-${paymentStatus.toLowerCase()}`}>{paymentStatusCopy[language][paymentStatus]}</span></td><td><select className={`status-select status-${ticket.status.toLowerCase()}`} value={ticket.status} onChange={(event) => void changeStatus(ticket, event.target.value as TicketStatus)}>{(['Pending', 'Confirmed', 'Cancelled', 'Used'] as TicketStatus[]).map((status) => <option key={status} value={status}>{statusCopy[language][status]}</option>)}</select></td></tr> })}
      </tbody></table></div>
      {!loading && visibleTickets.length === 0 && <div className="admin-empty"><TicketCheck /><p>{c.empty}</p></div>}
    </section>

    {createOpen && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false) }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="ticket-modal-title"><button className="admin-modal__close" onClick={() => setCreateOpen(false)}><X /></button><div className="admin-modal__heading"><span><TicketCheck /></span><div><h2 id="ticket-modal-title">{c.modalTitle}</h2><p>{c.modalText}</p></div></div><form onSubmit={createTicket}>
      <label className="field-wide">{c.tourName}{catalogTours.length > 0 ? <select name="tourName" required defaultValue=""><option value="" disabled>—</option>{catalogTours.map((tour) => <option key={tour.externalTourId} value={tour.name}>{tour.categoryName} · {tour.name}</option>)}</select> : <input name="tourName" required maxLength={160} />}</label><label>{c.date}<input type="date" name="tourDate" required /></label><label>{c.time}<input type="time" name="departureTime" required /></label><label className="field-wide">{c.name}<input name="customerName" required maxLength={160} /></label><label className="field-wide">{c.email}<input type="email" name="customerEmail" required maxLength={320} /></label><label>{c.guestCount}<input type="number" name="guestCount" defaultValue={2} min={1} max={100} required /></label><label>{c.amount}<span className="money-input"><input type="number" name="amount" min="0.01" step="0.01" required /><i>₺</i></span></label><div className="admin-modal__actions field-wide"><button type="button" onClick={() => setCreateOpen(false)}>{c.cancel}</button><button className="admin-primary-button" disabled={saving} type="submit">{saving ? <span className="button-spinner" /> : <><CheckCircle2 /> {c.save}</>}</button></div>
    </form></section></div>}
  </>
}
