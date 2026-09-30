import { ArrowRight, Camera, Clock3, Mail, MapPin, MessageCircle, Send } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import PublicPageLayout, { type PublicLanguage } from './PublicPageLayout'

const copy = {
  tr: {
    eyebrow: 'İLETİŞİM', title: 'Aklında ne varsa,', accent: 'aynı teknedeyiz.',
    description: 'Tur seçimi, rezervasyon veya yolculuğunla ilgili her konuda bize yaz. Ekibimiz en kısa sürede sana ulaşsın.',
    emailTitle: 'E-posta', emailText: 'Rezervasyon ve genel sorular', socialTitle: 'Instagram', socialText: 'Boğaz’dan güncel anlar', locationTitle: 'Kalkış bilgisi', locationText: 'Kesin iskele bilgisi biletinizde paylaşılır',
    formEyebrow: 'BİZE YAZ', formTitle: 'Nasıl yardımcı olabiliriz?', name: 'Ad soyad', email: 'E-posta adresi', topic: 'Konu', message: 'Mesajın',
    namePlaceholder: 'Adınız ve soyadınız', emailPlaceholder: 'ornek@eposta.com', topicPlaceholder: 'Nasıl yardımcı olabiliriz?', messagePlaceholder: 'Mesajınızı buraya yazın...', send: 'Mesajı hazırla', note: 'Gönder butonu e-posta uygulamanızı açar.',
    ready: 'Mesajınız hazırlandı. E-posta uygulamanız açılıyor.', hours: 'Yanıt süresi', hoursText: 'Mesajlara mümkün olan en kısa sürede dönüş yapıyoruz.',
  },
  en: {
    eyebrow: 'CONTACT', title: 'Whatever is on your mind,', accent: 'we are in the same boat.',
    description: 'Write to us about choosing a tour, your booking or your journey. Our team will get back to you as soon as possible.',
    emailTitle: 'Email', emailText: 'Bookings and general questions', socialTitle: 'Instagram', socialText: 'Recent moments from the Bosphorus', locationTitle: 'Departure details', locationText: 'Your exact pier is shared on your ticket',
    formEyebrow: 'WRITE TO US', formTitle: 'How can we help?', name: 'Full name', email: 'Email address', topic: 'Subject', message: 'Your message',
    namePlaceholder: 'Your full name', emailPlaceholder: 'name@example.com', topicPlaceholder: 'How can we help?', messagePlaceholder: 'Write your message here...', send: 'Prepare message', note: 'The send button opens your email application.',
    ready: 'Your message is ready. Your email application is opening.', hours: 'Response time', hoursText: 'We reply to messages as soon as possible.',
  },
}

function ContactContent({ language }: { language: PublicLanguage }) {
  const [prepared, setPrepared] = useState(false)
  const c = copy[language]

  useEffect(() => {
    document.title = language === 'tr' ? 'İletişim — PeremeTours' : 'Contact — PeremeTours'
  }, [language])

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const subject = String(data.get('topic') ?? '')
    const body = `${c.name}: ${String(data.get('name') ?? '')}\n${c.email}: ${String(data.get('email') ?? '')}\n\n${String(data.get('message') ?? '')}`
    setPrepared(true)
    window.location.href = `mailto:merhaba@peremetours.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return <>
    <section className="info-hero contact-hero"><div className="info-hero__rings" /><div className="shell"><span><MessageCircle /> {c.eyebrow}</span><h1>{c.title}<em>{c.accent}</em></h1><p>{c.description}</p></div></section>
    <section className="contact-section"><div className="shell">
      <div className="contact-cards">
        <a href="mailto:merhaba@peremetours.com"><span><Mail /></span><small>{c.emailTitle}</small><strong>merhaba@peremetours.com</strong><p>{c.emailText}</p><ArrowRight /></a>
        <a href="https://www.instagram.com/" target="_blank" rel="noreferrer"><span><Camera /></span><small>{c.socialTitle}</small><strong>@peremetours</strong><p>{c.socialText}</p><ArrowRight /></a>
        <article><span><MapPin /></span><small>{c.locationTitle}</small><strong>İstanbul Boğazı</strong><p>{c.locationText}</p></article>
      </div>
      <div className="contact-form-layout">
        <div className="contact-form-copy"><span>{c.formEyebrow}</span><h2>{c.formTitle}</h2><div><Clock3 /><p><strong>{c.hours}</strong>{c.hoursText}</p></div></div>
        <form className="contact-form" onSubmit={sendMessage}>
          {prepared && <div className="contact-success">{c.ready}</div>}
          <label>{c.name}<input name="name" required maxLength={100} placeholder={c.namePlaceholder} /></label>
          <label>{c.email}<input name="email" required type="email" maxLength={200} placeholder={c.emailPlaceholder} /></label>
          <label className="field-wide">{c.topic}<input name="topic" required maxLength={200} placeholder={c.topicPlaceholder} /></label>
          <label className="field-wide">{c.message}<textarea name="message" required maxLength={3000} rows={6} placeholder={c.messagePlaceholder} /></label>
          <div className="contact-form__submit field-wide"><small>{c.note}</small><button type="submit">{c.send}<Send /></button></div>
        </form>
      </div>
    </div></section>
  </>
}

export default function ContactPage() {
  return <PublicPageLayout>{(language) => <ContactContent language={language} />}</PublicPageLayout>
}
