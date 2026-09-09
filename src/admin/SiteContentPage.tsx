import { Camera, ExternalLink, LayoutTemplate, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { HomepageContentDocument, HomepageLanguageContent } from '../content/homepage'
import { ApiError, apiRequest } from '../lib/api'
import type { AdminLanguage } from './AdminLayout'

const copy = {
  tr: {
    eyebrow: 'SİTE YÖNETİMİ', title: 'Site İçerikleri', subtitle: 'Ana sayfadaki başlıkları, açıklamaları, hizmetleri ve Instagram videolarını yönetin.',
    turkish: 'Türkçe içerik', english: 'İngilizce içerik', hero: 'Ana giriş alanı', tours: 'Turlar alanı', services: 'Hizmetlerimiz alanı',
    why: 'Neden Pereme? alanı', stories: 'Hikâyeler & Instagram', final: 'Son rezervasyon çağrısı', lead: 'Ana başlık', accent: 'Vurgulu başlık',
    eyebrowLabel: 'Üst etiket', description: 'Açıklama', reviews: 'Puan altı metni', titleLabel: 'Başlık', browse: 'Turları gör butonu', booking: 'Rezervasyon butonu',
    benefit: 'Fayda', service: 'Hizmet', quote: 'Instagram videosu yoksa gösterilecek yorum', meta: 'Yorum bilgisi', pre: 'Üst metin', action: 'Buton metni',
    instagramHelp: 'Herkese açık Instagram Reel veya gönderi bağlantılarını ekleyin. En fazla 6 video gösterilir.', addInstagram: 'Instagram bağlantısı ekle',
    save: 'İçerikleri kaydet', saving: 'Kaydediliyor...', saved: 'Site içerikleri kaydedildi.', error: 'Site içerikleri yüklenemedi.',
  },
  en: {
    eyebrow: 'WEBSITE MANAGEMENT', title: 'Site Content', subtitle: 'Manage homepage titles, descriptions, services and Instagram videos.',
    turkish: 'Turkish content', english: 'English content', hero: 'Hero section', tours: 'Tours section', services: 'Our Services section',
    why: 'Why Pereme? section', stories: 'Stories & Instagram', final: 'Final booking call', lead: 'Main heading', accent: 'Accent heading',
    eyebrowLabel: 'Eyebrow label', description: 'Description', reviews: 'Rating subtext', titleLabel: 'Title', browse: 'View tours button', booking: 'Booking button',
    benefit: 'Benefit', service: 'Service', quote: 'Fallback review when no Instagram video exists', meta: 'Review details', pre: 'Top text', action: 'Button text',
    instagramHelp: 'Add public Instagram Reel or post links. Up to 6 videos are displayed.', addInstagram: 'Add Instagram link',
    save: 'Save content', saving: 'Saving...', saved: 'Site content saved.', error: 'Site content could not be loaded.',
  },
}

const fieldValue = (data: FormData, name: string) => String(data.get(name) ?? '').trim()

function readLanguageContent(data: FormData, current: HomepageLanguageContent): HomepageLanguageContent {
  return {
    hero: {
      lead: fieldValue(data, 'heroLead'), accent: fieldValue(data, 'heroAccent'), description: fieldValue(data, 'heroDescription'),
    },
    tours: {
      eyebrow: fieldValue(data, 'toursEyebrow'), lead: fieldValue(data, 'toursLead'), accent: fieldValue(data, 'toursAccent'), description: fieldValue(data, 'toursDescription'),
    },
    services: {
      eyebrow: fieldValue(data, 'servicesEyebrow'), lead: fieldValue(data, 'servicesLead'), accent: fieldValue(data, 'servicesAccent'), description: fieldValue(data, 'servicesDescription'),
      items: current.services.items.map((item, index) => ({
        ...item,
        title: fieldValue(data, `service-${index}-title`), description: fieldValue(data, `service-${index}-description`),
        browseLabel: fieldValue(data, `service-${index}-browse`), bookingLabel: fieldValue(data, `service-${index}-booking`),
      })),
    },
    why: {
      eyebrow: fieldValue(data, 'whyEyebrow'), lead: fieldValue(data, 'whyLead'), accent: fieldValue(data, 'whyAccent'), reviews: fieldValue(data, 'whyReviews'),
      benefits: current.why.benefits.map((benefit, index) => ({
        ...benefit,
        title: fieldValue(data, `benefit-${index}-title`), description: fieldValue(data, `benefit-${index}-description`),
      })),
    },
    stories: {
      eyebrow: fieldValue(data, 'storiesEyebrow'), lead: fieldValue(data, 'storiesLead'), accent: fieldValue(data, 'storiesAccent'),
      description: fieldValue(data, 'storiesDescription'), quote: fieldValue(data, 'storiesQuote'), meta: fieldValue(data, 'storiesMeta'),
    },
    final: { pre: fieldValue(data, 'finalPre'), title: fieldValue(data, 'finalTitle'), action: fieldValue(data, 'finalAction') },
  }
}

export default function SiteContentPage() {
  const { language } = useOutletContext<{ language: AdminLanguage }>()
  const { session } = useAuth()
  const [editLanguage, setEditLanguage] = useState<AdminLanguage>('tr')
  const [content, setContent] = useState<HomepageContentDocument | null>(null)
  const [instagramUrls, setInstagramUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const c = copy[language]

  useEffect(() => {
    document.title = `${c.title} — PeremeTours`
  }, [c.title])

  useEffect(() => {
    let active = true
    apiRequest<HomepageContentDocument>('/api/v1/admin/site-content/homepage', { token: session!.accessToken })
      .then((result) => { if (active) { setContent(result); setInstagramUrls(result.instagramUrls) } })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.message : c.error) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [c.error, session])

  const saveContent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!content) return
    setSaving(true)
    setError('')
    setSuccess('')
    const languageContent = readLanguageContent(new FormData(event.currentTarget), content[editLanguage])
    const nextContent = { ...content, [editLanguage]: languageContent, instagramUrls: instagramUrls.map((url) => url.trim()).filter(Boolean) }
    try {
      const updated = await apiRequest<HomepageContentDocument>('/api/v1/admin/site-content/homepage', {
        method: 'PUT', token: session!.accessToken, body: nextContent,
      })
      setContent(updated)
      setInstagramUrls(updated.instagramUrls)
      setSuccess(c.saved)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : c.error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="site-content-loading"><span className="button-spinner" /></div>
  if (!content) return <div className="admin-alert">{error || c.error}</div>
  const current = content[editLanguage]

  return <>
    <div className="admin-page-heading"><div><span>{c.eyebrow}</span><h1>{c.title}</h1><p>{c.subtitle}</p></div></div>
    {error && <div className="admin-alert">{error}</div>}
    {success && <div className="admin-alert site-content-success">{success}</div>}
    <div className="site-content-language-tabs"><button className={editLanguage === 'tr' ? 'active' : ''} type="button" onClick={() => { setEditLanguage('tr'); setSuccess('') }}>TR <span>{c.turkish}</span></button><button className={editLanguage === 'en' ? 'active' : ''} type="button" onClick={() => { setEditLanguage('en'); setSuccess('') }}>EN <span>{c.english}</span></button></div>
    <form className="site-content-form" key={editLanguage} onSubmit={saveContent}>
      <section><header><LayoutTemplate /><div><h2>{c.hero}</h2></div></header><div className="site-content-fields"><label>{c.lead}<input name="heroLead" maxLength={3000} defaultValue={current.hero.lead} /></label><label>{c.accent}<input name="heroAccent" maxLength={3000} defaultValue={current.hero.accent} /></label><label className="field-wide">{c.description}<textarea name="heroDescription" rows={3} maxLength={3000} defaultValue={current.hero.description} /></label></div></section>
      <section><header><LayoutTemplate /><div><h2>{c.tours}</h2></div></header><div className="site-content-fields"><label>{c.eyebrowLabel}<input name="toursEyebrow" maxLength={3000} defaultValue={current.tours.eyebrow} /></label><label>{c.lead}<input name="toursLead" maxLength={3000} defaultValue={current.tours.lead} /></label><label>{c.accent}<input name="toursAccent" maxLength={3000} defaultValue={current.tours.accent} /></label><label className="field-wide">{c.description}<textarea name="toursDescription" rows={3} maxLength={3000} defaultValue={current.tours.description} /></label></div></section>
      <section><header><LayoutTemplate /><div><h2>{c.services}</h2></div></header><div className="site-content-fields"><label>{c.eyebrowLabel}<input name="servicesEyebrow" maxLength={3000} defaultValue={current.services.eyebrow} /></label><label>{c.lead}<input name="servicesLead" maxLength={3000} defaultValue={current.services.lead} /></label><label>{c.accent}<input name="servicesAccent" maxLength={3000} defaultValue={current.services.accent} /></label><label className="field-wide">{c.description}<textarea name="servicesDescription" rows={3} maxLength={3000} defaultValue={current.services.description} /></label></div><div className="site-content-repeat-grid">{current.services.items.map((item, index) => <article key={item.categoryKey}><strong>{c.service} 0{index + 1} · {item.categoryKey}</strong><label>{c.titleLabel}<input name={`service-${index}-title`} maxLength={3000} defaultValue={item.title} /></label><label>{c.description}<textarea name={`service-${index}-description`} rows={3} maxLength={3000} defaultValue={item.description} /></label><label>{c.browse}<input name={`service-${index}-browse`} maxLength={3000} defaultValue={item.browseLabel} /></label><label>{c.booking}<input name={`service-${index}-booking`} maxLength={3000} defaultValue={item.bookingLabel} /></label></article>)}</div></section>
      <section><header><LayoutTemplate /><div><h2>{c.why}</h2></div></header><div className="site-content-fields"><label>{c.eyebrowLabel}<input name="whyEyebrow" maxLength={3000} defaultValue={current.why.eyebrow} /></label><label>{c.lead}<input name="whyLead" maxLength={3000} defaultValue={current.why.lead} /></label><label>{c.accent}<input name="whyAccent" maxLength={3000} defaultValue={current.why.accent} /></label><label>{c.reviews}<input name="whyReviews" maxLength={3000} defaultValue={current.why.reviews} /></label></div><div className="site-content-repeat-grid">{current.why.benefits.map((benefit, index) => <article key={index}><strong>{c.benefit} 0{index + 1}</strong><label>{c.titleLabel}<input name={`benefit-${index}-title`} maxLength={3000} defaultValue={benefit.title} /></label><label>{c.description}<textarea name={`benefit-${index}-description`} rows={3} maxLength={3000} defaultValue={benefit.description} /></label></article>)}</div></section>
      <section><header><Camera /><div><h2>{c.stories}</h2><p>{c.instagramHelp}</p></div></header><div className="site-content-fields"><label>{c.eyebrowLabel}<input name="storiesEyebrow" maxLength={3000} defaultValue={current.stories.eyebrow} /></label><label>{c.lead}<input name="storiesLead" maxLength={3000} defaultValue={current.stories.lead} /></label><label>{c.accent}<input name="storiesAccent" maxLength={3000} defaultValue={current.stories.accent} /></label><label className="field-wide">{c.description}<textarea name="storiesDescription" rows={3} maxLength={3000} defaultValue={current.stories.description} /></label><label className="field-wide">{c.quote}<textarea name="storiesQuote" rows={4} maxLength={3000} defaultValue={current.stories.quote} /></label><label className="field-wide">{c.meta}<input name="storiesMeta" maxLength={3000} defaultValue={current.stories.meta} /></label></div><div className="instagram-url-list">{instagramUrls.map((url, index) => <div key={index}><Camera /><input type="url" value={url} placeholder="https://www.instagram.com/reel/.../" onChange={(event) => setInstagramUrls((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /><a href={url || undefined} target="_blank" rel="noreferrer" aria-label="Instagram"><ExternalLink /></a><button type="button" onClick={() => setInstagramUrls((items) => items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 /></button></div>)}{instagramUrls.length < 6 && <button type="button" onClick={() => setInstagramUrls((items) => [...items, ''])}><Plus /> {c.addInstagram}</button>}</div></section>
      <section><header><LayoutTemplate /><div><h2>{c.final}</h2></div></header><div className="site-content-fields"><label>{c.pre}<input name="finalPre" maxLength={3000} defaultValue={current.final.pre} /></label><label>{c.titleLabel}<input name="finalTitle" maxLength={3000} defaultValue={current.final.title} /></label><label>{c.action}<input name="finalAction" maxLength={3000} defaultValue={current.final.action} /></label></div></section>
      <div className="site-content-save"><button className="admin-primary-button" disabled={saving} type="submit"><Save /> {saving ? c.saving : c.save}</button></div>
    </form>
  </>
}
