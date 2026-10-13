import { Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import '../pages/info-pages.css'

const copy = {
  tr: { name: 'Ad soyad', email: 'E-posta adresi', topic: 'Konu', message: 'Mesajın', namePlaceholder: 'Adınız ve soyadınız',
    emailPlaceholder: 'ornek@eposta.com', topicPlaceholder: 'Nasıl yardımcı olabiliriz?', messagePlaceholder: 'Mesajınızı buraya yazın...',
    send: 'Mesajı hazırla', note: 'Bu buton e-posta uygulamanızı açar; mesajı oradan gönderebilirsiniz.', ready: 'Mesajınız hazırlandı. E-posta uygulamanız açılıyor.' },
  en: { name: 'Full name', email: 'Email address', topic: 'Subject', message: 'Your message', namePlaceholder: 'Your full name',
    emailPlaceholder: 'name@example.com', topicPlaceholder: 'How can we help?', messagePlaceholder: 'Write your message here...',
    send: 'Prepare message', note: 'This button opens your email application, where you can send the message.', ready: 'Your message is ready. Your email application is opening.' },
}

export default function ContactForm({ language }: { language: 'tr' | 'en' }) {
  const [prepared, setPrepared] = useState(false)
  const c = copy[language]
  const prepareMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const subject = String(data.get('topic') ?? '').trim()
    const body = `${c.name}: ${String(data.get('name') ?? '').trim()}\n${c.email}: ${String(data.get('email') ?? '').trim()}\n\n${String(data.get('message') ?? '').trim()}`
    setPrepared(true)
    // Preserve the existing contact workflow. No form data is stored or sent to a new API.
    window.location.href = `mailto:merhaba@peremetours.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }
  return <form className="contact-form" onSubmit={prepareMessage}>
    {prepared && <div className="contact-success" role="status">{c.ready}</div>}
    <label>{c.name}<input name="name" required maxLength={100} placeholder={c.namePlaceholder} autoComplete="name" /></label>
    <label>{c.email}<input name="email" required type="email" maxLength={200} placeholder={c.emailPlaceholder} autoComplete="email" /></label>
    <label className="field-wide">{c.topic}<input name="topic" required maxLength={200} placeholder={c.topicPlaceholder} /></label>
    <label className="field-wide">{c.message}<textarea name="message" required maxLength={3000} rows={5} placeholder={c.messagePlaceholder} /></label>
    <div className="contact-form__submit field-wide"><small>{c.note}</small><button type="submit">{c.send}<Send /></button></div>
  </form>
}
