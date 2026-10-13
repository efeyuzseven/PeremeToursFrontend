import { Send } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, apiRequest } from '../lib/api'
import '../pages/info-pages.css'

const copy = {
  tr: { name: 'Ad soyad', email: 'E-posta adresi', topic: 'Konu', message: 'Mesajın', namePlaceholder: 'Adınız ve soyadınız',
    emailPlaceholder: 'ornek@eposta.com', topicPlaceholder: 'Nasıl yardımcı olabiliriz?', messagePlaceholder: 'Mesajınızı buraya yazın...',
    send: 'Mesajı gönder', sending: 'Gönderiliyor...', note: 'Mesajınız doğrudan ilgili ekibimize iletilir. Lütfen kart veya kimlik bilgilerinizi yazmayın.', privacy: 'KVKK Aydınlatma Metni',
    ready: 'Talebiniz alındı ve ekibimize iletilmek üzere kaydedildi.', error: 'Talep alınamadı. Bilgileriniz korunuyor; tekrar deneyebilirsiniz.', rateLimit: 'Kısa sürede çok fazla talep gönderdiniz. Lütfen daha sonra tekrar deneyin.' },
  en: { name: 'Full name', email: 'Email address', topic: 'Subject', message: 'Your message', namePlaceholder: 'Your full name',
    emailPlaceholder: 'name@example.com', topicPlaceholder: 'How can we help?', messagePlaceholder: 'Write your message here...',
    send: 'Send message', sending: 'Sending...', note: 'Your message is forwarded directly to our team. Please do not include card or identity information.', privacy: 'KVKK Privacy Notice',
    ready: 'Your request has been received and saved for forwarding to our team.', error: 'Your request could not be accepted. Your draft is retained; please try again.', rateLimit: 'You have sent too many requests. Please try again later.' },
}

export default function ContactForm({ language }: { language: 'tr' | 'en' }) {
  const [prepared, setPrepared] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  const submission = useRef<{ fingerprint: string; requestId: string } | null>(null)
  const c = copy[language]
  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (inFlight.current) return
    const form = event.currentTarget
    const data = new FormData(form)
    const payload = { name: String(data.get('name') ?? '').trim(), email: String(data.get('email') ?? '').trim(),
      topic: String(data.get('topic') ?? '').trim(), message: String(data.get('message') ?? '').trim(), language, website: String(data.get('website') ?? '') }
    const fingerprint = JSON.stringify(payload)
    // An uncertain HTTP response can be retried with the same key, without queuing two emails again.
    if (submission.current?.fingerprint !== fingerprint) submission.current = { fingerprint, requestId: crypto.randomUUID() }
    inFlight.current = true; setBusy(true); setError(''); setPrepared(false)
    try {
      await apiRequest('/api/v1/contact-requests', { method: 'POST', body: { ...payload, requestId: submission.current.requestId }, signal: AbortSignal.timeout(20_000) })
      form.reset(); submission.current = null; setPrepared(true)
    } catch (caught) { setError(caught instanceof ApiError && caught.status === 429 ? c.rateLimit : c.error) }
    finally { inFlight.current = false; setBusy(false) }
  }
  return <form className="contact-form" onSubmit={sendMessage} aria-busy={busy}>
    {prepared && <div className="contact-success" role="status">{c.ready}</div>}
    {error && <div className="contact-error" role="alert">{error}</div>}
    <label>{c.name}<input name="name" required disabled={busy} maxLength={100} placeholder={c.namePlaceholder} autoComplete="name" /></label>
    <label>{c.email}<input name="email" required disabled={busy} type="email" maxLength={200} placeholder={c.emailPlaceholder} autoComplete="email" /></label>
    <label className="field-wide">{c.topic}<input name="topic" required disabled={busy} maxLength={200} placeholder={c.topicPlaceholder} /></label>
    <label className="field-wide">{c.message}<textarea name="message" required disabled={busy} maxLength={3000} rows={5} placeholder={c.messagePlaceholder} /></label>
    <label className="contact-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} maxLength={200} autoComplete="off" /></label>
    <div className="contact-form__submit field-wide"><small>{c.note} <Link to="/kvkk-aydinlatma-metni" target="_blank" rel="noopener noreferrer">{c.privacy}</Link></small><button disabled={busy} type="submit">{busy ? c.sending : c.send}<Send /></button></div>
  </form>
}
