import { ArrowRight, HelpCircle, Minus, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest, ApiError } from '../lib/api'
import PublicPageLayout, { type PublicLanguage } from './PublicPageLayout'

type FrequentlyAskedQuestion = {
  id: number
  questionTr: string
  answerTr: string
  questionEn: string
  answerEn: string
  sortOrder: number
}

const copy = {
  tr: {
    eyebrow: 'YARDIM MERKEZİ', title: 'Merak ettiklerin,', accent: 'tek bir yerde.',
    description: 'Rezervasyondan kalkış saatine kadar en çok sorulan soruların yanıtlarını burada bulabilirsin.',
    search: 'Sorularda ara...', empty: 'Aramana uygun bir soru bulunamadı.', error: 'Sorular şu anda yüklenemiyor. Lütfen daha sonra tekrar deneyin.',
    kicker: 'Başka bir sorun mu var?', support: 'Ekibimiz yolculuğundan önce ve sonra yanında.', contact: 'Bize ulaş',
  },
  en: {
    eyebrow: 'HELP CENTRE', title: 'Everything you wonder,', accent: 'in one place.',
    description: 'Find answers to the most common questions, from booking to departure time.',
    search: 'Search questions...', empty: 'No question matched your search.', error: 'Questions cannot be loaded right now. Please try again later.',
    kicker: 'Still have a question?', support: 'Our team is here before and after your journey.', contact: 'Contact us',
  },
}

function FaqContent({ language }: { language: PublicLanguage }) {
  const [questions, setQuestions] = useState<FrequentlyAskedQuestion[]>([])
  const [openId, setOpenId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const c = copy[language]

  useEffect(() => {
    document.title = language === 'tr' ? 'Sıkça Sorulan Sorular — PeremeTours' : 'Frequently Asked Questions — PeremeTours'
  }, [language])

  useEffect(() => {
    let active = true
    apiRequest<FrequentlyAskedQuestion[]>('/api/v1/faqs')
      .then((result) => { if (active) { setQuestions(result); setOpenId(result[0]?.id ?? null) } })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.message : c.error) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [c.error])

  const filtered = useMemo(() => {
    const locale = language === 'tr' ? 'tr-TR' : 'en-US'
    const value = query.trim().toLocaleLowerCase(locale)
    return questions.filter((question) => !value || `${language === 'tr' ? question.questionTr : question.questionEn} ${language === 'tr' ? question.answerTr : question.answerEn}`.toLocaleLowerCase(locale).includes(value))
  }, [language, query, questions])

  return <>
    <section className="info-hero faq-hero"><div className="info-hero__rings" /><div className="shell"><span><HelpCircle /> {c.eyebrow}</span><h1>{c.title}<em>{c.accent}</em></h1><p>{c.description}</p></div></section>
    <section className="faq-section"><div className="shell faq-layout">
      <div className="faq-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.search} aria-label={c.search} /></div>
      {error && <div className="info-alert">{error}</div>}
      <div className="faq-list">
        {loading && Array.from({ length: 5 }).map((_, index) => <div className="faq-skeleton" key={index} />)}
        {!loading && filtered.map((question, index) => { const isOpen = openId === question.id; const title = language === 'tr' ? question.questionTr : question.questionEn; const answer = language === 'tr' ? question.answerTr : question.answerEn; return <article className={isOpen ? 'is-open' : ''} key={question.id}><button type="button" aria-expanded={isOpen} onClick={() => setOpenId(isOpen ? null : question.id)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{title}</strong>{isOpen ? <Minus /> : <Plus />}</button><div className="faq-answer"><p>{answer}</p></div></article> })}
        {!loading && !error && filtered.length === 0 && <div className="info-empty"><HelpCircle /><p>{c.empty}</p></div>}
      </div>
      <aside className="faq-contact"><div><span>{c.kicker}</span><h2>{c.support}</h2></div><Link to="/iletisim">{c.contact}<ArrowRight /></Link></aside>
    </div></section>
  </>
}

export default function FaqPage() {
  return <PublicPageLayout>{(language) => <FaqContent language={language} />}</PublicPageLayout>
}
