import { ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setPageMetadata } from '../lib/site'
import PublicPageLayout, { type PublicLanguage } from './PublicPageLayout'
import './content-pages.css'

const copy = {
  tr: { title: 'Sayfa bulunamadı', text: 'Aradığın sayfa kaldırılmış ya da adresi değişmiş olabilir.', home: 'Ana sayfaya dön' },
  en: { title: 'Page not found', text: 'The page you are looking for may have been removed or moved to a new address.', home: 'Back to homepage' },
}

// Unknown addresses get their own page instead of silently showing the homepage, and are kept out of search results.
function NotFoundContent({ language }: { language: PublicLanguage }) {
  const c = copy[language]
  useEffect(() => { setPageMetadata({ title: c.title, language, indexable: false }) }, [c.title, language])
  return <section className="shell content-state content-state--page">
    <h1>{c.title}</h1><p>{c.text}</p>
    <Link to="/"><ArrowLeft size={16} />{c.home}</Link>
  </section>
}

export default function NotFoundPage() {
  return <PublicPageLayout>{language => <NotFoundContent language={language} />}</PublicPageLayout>
}
