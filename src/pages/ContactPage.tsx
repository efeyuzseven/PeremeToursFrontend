import { ArrowRight, Camera, Clock3, Mail, MessageCircle } from 'lucide-react'
import { useEffect } from 'react'
import PublicPageLayout, { type PublicLanguage } from './PublicPageLayout'
import { INSTAGRAM_PROFILE_URL, setPageMetadata } from '../lib/site'
import ContactForm from '../components/ContactForm'

const copy = {
  tr: {
    eyebrow: 'İLETİŞİM', title: 'Aklında ne varsa,', accent: 'aynı teknedeyiz.',
    description: 'Tur seçimi, rezervasyon veya yolculuğunla ilgili her konuda bize yaz. Ekibimiz en kısa sürede sana ulaşsın.',
    emailTitle: 'E-posta', emailText: 'Rezervasyon ve genel sorular', socialTitle: 'Instagram', socialText: 'Boğaz’dan güncel anlar',
    formEyebrow: 'BİZE YAZ', formTitle: 'Nasıl yardımcı olabiliriz?', hours: 'Yanıt süresi', hoursText: 'Mesajlara mümkün olan en kısa sürede dönüş yapıyoruz.',
  },
  en: {
    eyebrow: 'CONTACT', title: 'Whatever is on your mind,', accent: 'we are in the same boat.',
    description: 'Write to us about choosing a tour, your booking or your journey. Our team will get back to you as soon as possible.',
    emailTitle: 'Email', emailText: 'Bookings and general questions', socialTitle: 'Instagram', socialText: 'Recent moments from the Bosphorus',
    formEyebrow: 'WRITE TO US', formTitle: 'How can we help?', hours: 'Response time', hoursText: 'We reply to messages as soon as possible.',
  },
}

function ContactContent({ language }: { language: PublicLanguage }) {
  const c = copy[language]

  useEffect(() => {
    setPageMetadata({ title: language === 'tr' ? 'İletişim' : 'Contact', description: c.description, language })
  }, [language, c.description])

  return <>
    <section className="info-hero contact-hero"><div className="info-hero__rings" /><div className="shell"><span><MessageCircle /> {c.eyebrow}</span><h1>{c.title}<em>{c.accent}</em></h1><p>{c.description}</p></div></section>
    <section className="contact-section"><div className="shell">
      <div className="contact-cards">
        <a href="mailto:merhaba@peremetours.com"><span><Mail /></span><small>{c.emailTitle}</small><strong>merhaba@peremetours.com</strong><p>{c.emailText}</p><ArrowRight /></a>
        <a href={INSTAGRAM_PROFILE_URL} target="_blank" rel="noopener noreferrer"><span><Camera /></span><small>{c.socialTitle}</small><strong>@peremetours</strong><p>{c.socialText}</p><ArrowRight /></a>
      </div>
      <div className="contact-form-layout">
        <div className="contact-form-copy"><span>{c.formEyebrow}</span><h2>{c.formTitle}</h2><div><Clock3 /><p><strong>{c.hours}</strong>{c.hoursText}</p></div></div>
        <ContactForm language={language} />
      </div>
    </div></section>
  </>
}

export default function ContactPage() {
  return <PublicPageLayout>{(language) => <ContactContent language={language} />}</PublicPageLayout>
}
