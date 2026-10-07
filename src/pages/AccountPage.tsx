import {
  CalendarDays,
  LogOut,
  Mail,
  RefreshCw,
  Ticket,
  UserRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiRequest, ApiError } from '../lib/api'
import { setPageMetadata } from '../lib/site'
import { TicketQr } from '../components/TicketQr'
import PublicPageLayout, { type PublicLanguage } from './PublicPageLayout'
import './account.css'

type Profile = {
  firstName: string
  lastName: string | null
  email: string
  createdAtUtc: string
}
type CancellationState = { cancellationStatus?: string | null }
type Reservation = {
  id: string
  ticketCode: string
  tourName: string
  tourDate: string
  departureTime: string
  departurePort: string
  guestCount: number
  amount: number
  currency: string
  status: string
  paymentStatus: string
  ticketingStatus: string
  emailStatus: string | null
  passengers: {
    number: number
    name: string
    pnr: string | null
    ticketGuid: string | null
  }[]
}
const states: Record<PublicLanguage, Record<string, string>> = {
  tr: {
    Pending: 'Bekliyor',
    Confirmed: 'Onaylandı',
    Cancelled: 'İptal edildi',
    Used: 'Kullanıldı',
    Paid: 'Ödendi',
    Refunded: 'İade / iptal onaylandı',
    Failed: 'Başarısız',
    ReviewRequired: 'Kontrol gerekli',
    Issued: 'Bilet hazır',
    Processing: 'İşleniyor',
    Queued: 'Mail kuyrukta',
    Sent: 'Mail gönderildi',
    NotRequired: '—',
  },
  en: {
    Pending: 'Pending',
    Confirmed: 'Confirmed',
    Cancelled: 'Cancelled',
    Used: 'Used',
    Paid: 'Paid',
    Refunded: 'Reversal confirmed',
    Failed: 'Failed',
    ReviewRequired: 'Review required',
    Issued: 'Tickets ready',
    Processing: 'Processing',
    Queued: 'Email queued',
    Sent: 'Email sent',
    NotRequired: '—',
  },
}

function AccountContent({ language }: { language: PublicLanguage }) {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const tr = language === 'tr'
  const [profile, setProfile] = useState<Profile | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setPageMetadata({ title: tr ? 'Hesabım' : 'My account', language, indexable: false })
    Promise.all([
      apiRequest<Profile>('/api/v1/account/profile', {
        token: session!.accessToken,
        cache: 'no-store',
        signal: controller.signal,
      }),
      apiRequest<(Reservation & CancellationState)[]>(
        '/api/v1/account/reservations',
        {
          token: session!.accessToken,
          cache: 'no-store',
          signal: controller.signal,
        },
      ),
    ])
      .then(([person, bookings]) => {
        if (!controller.signal.aborted) {
          setProfile(person)
          setReservations(
            bookings.map((booking) =>
              booking.cancellationStatus &&
              booking.cancellationStatus !== 'Completed'
                ? {
                    ...booking,
                    status: tr
                      ? 'İptal / iade kontrol ediliyor'
                      : 'Cancellation / refund under review',
                  }
                : booking,
            ),
          )
          setError('')
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof ApiError
              ? failure.message
              : tr
                ? 'Hesap bilgileri yüklenemedi.'
                : 'Could not load your account.',
          )
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [session, reload, tr, language])
  const date = (value: string) =>
    new Intl.DateTimeFormat(tr ? 'tr-TR' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(value.length === 10 ? `${value}T12:00:00` : value))
  return (
    <div className="shell account-page">
      <div className="account-heading">
        <div>
          <div className="eyebrow">
            <UserRound size={17} />{' '}
            {tr ? 'PEREME HESABIN' : 'YOUR PEREME ACCOUNT'}
          </div>
          <h1>
            {tr ? 'Merhaba' : 'Hello'},{' '}
            <em>{profile?.firstName ?? session?.user.firstName}.</em>
          </h1>
          <p>
            {tr
              ? 'Bilgilerin, rezervasyonların ve yolculuk biletlerin bir arada.'
              : 'Your details, bookings and travel tickets, together.'}
          </p>
        </div>
        <button
          type="button"
          className="account-action"
          onClick={() => {
            logout()
            navigate('/', { replace: true })
          }}
        >
          <LogOut size={17} /> {tr ? 'Çıkış yap' : 'Sign out'}
        </button>
      </div>
      {session?.user.role === 'Admin' && (
        <p>
          <Link to="/admin/tickets">
            {tr ? 'Yönetim paneline git →' : 'Open admin panel →'}
          </Link>
        </p>
      )}
      {error && (
        <p className="account-alert" role="alert">
          {error}
        </p>
      )}
      <section className="account-profile">
        <h2>
          <UserRound size={20} />{' '}
          {tr ? 'Kişisel bilgilerim' : 'Personal details'}
        </h2>
        {profile && (
          <dl>
            <div>
              <dt>{tr ? 'Ad soyad' : 'Full name'}</dt>
              <dd>
                {profile.firstName} {profile.lastName}
              </dd>
            </div>
            <div>
              <dt>{tr ? 'E-posta' : 'Email'}</dt>
              <dd>{profile.email}</dd>
            </div>
            <div>
              <dt>{tr ? 'Üyelik tarihi' : 'Member since'}</dt>
              <dd>{date(profile.createdAtUtc)}</dd>
            </div>
          </dl>
        )}
      </section>
      <div className="account-section-heading">
        <h2>
          <Ticket size={21} /> {tr ? 'Rezervasyonlarım' : 'My bookings'}
        </h2>
        <button
          type="button"
          className="account-action"
          disabled={loading}
          onClick={() => {
            setLoading(true)
            setReload((value) => value + 1)
          }}
        >
          <RefreshCw size={17} /> {tr ? 'Yenile' : 'Refresh'}
        </button>
      </div>
      {loading && (
        <p role="status">
          {tr ? 'Rezervasyonların yükleniyor…' : 'Loading your bookings…'}
        </p>
      )}
      {!loading && !error && reservations.length === 0 && (
        <div className="account-empty">
          <Ticket size={34} />
          <h3>{tr ? 'Henüz rezervasyonun yok.' : 'No bookings yet.'}</h3>
          <p>
            {tr
              ? 'Giriş yaparak satın aldığın biletler burada görünür. Misafir olarak yapılan rezervasyonlar otomatik bağlanmaz.'
              : 'Tickets purchased while signed in appear here. Guest bookings are not linked automatically.'}
          </p>
          <Link className="button button--navy" to="/#turlar">
            {tr ? 'Turları görüntüle' : 'View tours'}
          </Link>
        </div>
      )}
      <div className="account-reservations">
        {reservations.map((booking) => (
          <article className="account-reservation" key={booking.id}>
            <div className="account-reservation-heading">
              <div>
                <small>{booking.ticketCode}</small>
                <h3>{booking.tourName}</h3>
              </div>
              <span
                className={`account-badge ${booking.status === 'Cancelled' ? 'is-cancelled' : ''}`}
              >
                {states[language][booking.status] ?? booking.status}
              </span>
            </div>
            <div className="account-reservation-meta">
              <span>
                <CalendarDays size={17} /> {date(booking.tourDate)} ·{' '}
                {booking.departureTime.slice(0, 5)}
              </span>
              <span>{booking.departurePort}</span>
              <span>
                {booking.guestCount} {tr ? 'misafir' : 'guests'}
              </span>
            </div>
            <div className="account-reservation-status">
              <strong>
                {new Intl.NumberFormat(tr ? 'tr-TR' : 'en-GB', {
                  style: 'currency',
                  currency: booking.currency,
                }).format(booking.amount)}
              </strong>
              <span>
                {states[language][booking.paymentStatus] ??
                  booking.paymentStatus}
              </span>
              {booking.emailStatus && (
                <span>
                  <Mail size={15} />{' '}
                  {states[language][booking.emailStatus] ?? booking.emailStatus}
                </span>
              )}
            </div>
            <div className="account-passengers">
              {booking.passengers.map((passenger) => (
                <div className="account-passenger" key={passenger.number}>
                  <strong>
                    {passenger.number}. {passenger.name}
                  </strong>
                  {passenger.pnr && <p>PNR: {passenger.pnr}</p>}
                  <TicketQr
                    guid={passenger.ticketGuid}
                    label={`${passenger.number}. ${tr ? 'yolcu bileti' : 'passenger ticket'}`}
                  />
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default function AccountPage() {
  return (
    <PublicPageLayout>
      {(language) => <AccountContent language={language} />}
    </PublicPageLayout>
  )
}
