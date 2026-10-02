import { LockKeyhole } from 'lucide-react'
import { BookingSelect } from './BookingSelect'

const texts = {
  tr: { title: 'Ödeme Bilgileri', notice: 'Ödeme henüz etkin değil. Kart bilgisi alanları devre dışıdır; kart bilgisi alınmaz ve işlem başlatılmaz.', holder: 'Kart Üzerindeki İsim', number: 'Kart Numarası', month: 'Son Kullanma Ayı', year: 'Son Kullanma Yılı', monthPlaceholder: 'AA', yearPlaceholder: 'YYYY' },
  en: { title: 'Payment details', notice: 'Payments are not enabled yet. Card fields are disabled; no card details are collected and no payment is started.', holder: 'Name on card', number: 'Card number', month: 'Expiry month', year: 'Expiry year', monthPlaceholder: 'MM', yearPlaceholder: 'YYYY' },
}

export function BookingPaymentFields({ language }: { language: 'tr' | 'en' }) {
  const c = texts[language]
  // No card state or payment handler while the POS workflow is disabled.
  return <section className="reservation-payment">
    <div className="reservation-section-heading"><h3><LockKeyhole size={17} /> {c.title}</h3><p>{c.notice}</p></div>
    <fieldset className="reservation-payment__fields" disabled aria-label={c.title}>
      <label><span className="reservation-field-label">{c.holder}</span><input type="text" autoComplete="off" disabled /></label>
      <label><span className="reservation-field-label">{c.number}</span><input type="text" inputMode="numeric" placeholder="•••• •••• •••• ••••" autoComplete="off" disabled /></label>
      <BookingSelect label={c.month} value="" placeholder={c.monthPlaceholder} options={[]} onChange={() => undefined} disabled />
      <BookingSelect label={c.year} value="" placeholder={c.yearPlaceholder} options={[]} onChange={() => undefined} disabled />
      <label><span className="reservation-field-label">CVC</span><input type="password" inputMode="numeric" placeholder="•••" autoComplete="off" disabled /></label>
    </fieldset>
  </section>
}
