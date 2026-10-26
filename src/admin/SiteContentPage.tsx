import { Camera, ExternalLink, ImagePlus, LayoutTemplate, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { homepageImages, homepageTextFields, normalizeHomepage, type HomepageContentDocument } from '../content/homepage'
import { ApiError, apiBaseUrl, apiRequest, apiUpload } from '../lib/api'
import { setPageMetadata } from '../lib/site'
import type { AdminLanguage } from './AdminLayout'

const copy = {
  tr: { title: 'Site İçerikleri', subtitle: 'Ana sayfanın görsellerini, metinlerini ve bölüm görünürlüğünü yönetin. TR / EN taslakları birlikte kaydedilir.',
    hero: 'Ana giriş alanı', tours: 'Turlar alanı', why: 'Neden Pereme?',
 stories: 'Hikâyeler & Instagram', final: 'Son rezervasyon çağrısı',
    navigation: 'Menü yazıları', booking: 'Tur arama ve kategori yazıları', marquee: 'Kayan bilgi şeridi', footer: 'Alt bilgi', images: 'Kapak ve bölüm görselleri',
    lead: 'Ana başlık', accent: 'Vurgulu başlık', description: 'Açıklama', eyebrow: 'Üst etiket', reviews: 'Puan altı metni', titleLabel: 'Başlık', browse: 'Turları gör butonu', bookingLabel: 'Rezervasyon butonu',
    quote: 'Instagram videosu yoksa gösterilecek yorum', meta: 'Yorum bilgisi', pre: 'Üst metin', action: 'Buton metni',
    imageHelp: 'JPG, PNG veya WebP · En fazla 8 MB. Görseller iki dil için ortaktır. Yükledikten sonra içerikleri kaydedin. Tur kartı görselleri ayrıca Tur İçerikleri ekranındadır.',
    choose: 'Görsel yükle', reset: 'Varsayılanı kullan', focus: 'Görsel odak noktası', positions: ['Orta', 'Üst', 'Alt', 'Sol', 'Sağ'],
    visibility: 'Bölüm görünürlüğü', visible: 'Göster', heroCard: 'Ana kapak rota kartı',
    instagramHelp: 'En fazla 6 herkese açık Instagram Reel / gönderi bağlantısı.', addInstagram: 'Instagram bağlantısı ekle',
    save: 'Tüm değişiklikleri kaydet', saving: 'Kaydediliyor...', saved: 'İki dildeki içerikler ve görseller kaydedildi.', error: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
    dirty: 'Kaydedilmemiş değişiklikler var.', clean: 'İçerikler güncel.', preview: 'Ana sayfayı aç', hint: 'Tur sayfalarının kapak ve bölümleri: Tur Sayfaları. Satılan tur kartlarının yazı ve görselleri: Tur İçerikleri.',
    leave: 'Kaydedilmemiş değişiklikler var. Sayfadan ayrılmak istiyor musunuz?' },
  en: { title: 'Site Content', subtitle: 'Manage homepage images, text and section visibility. TR / EN drafts are saved together.',
    hero: 'Hero section', tours: 'Tours section', why: 'Why Pereme?',
 stories: 'Stories & Instagram', final: 'Final booking call',
    navigation: 'Menu labels', booking: 'Tour search and category labels', marquee: 'Scrolling information strip', footer: 'Footer', images: 'Cover and section images',
    lead: 'Main heading', accent: 'Accent heading', description: 'Description', eyebrow: 'Eyebrow', reviews: 'Rating subtext', titleLabel: 'Title', browse: 'View tours button', bookingLabel: 'Booking button',
    quote: 'Fallback review when no Instagram video exists', meta: 'Review details', pre: 'Top text', action: 'Button label',
    imageHelp: 'JPG, PNG or WebP · Up to 8 MB. Images are shared across languages. Save content after uploading. Tour card images are managed in Tour Content.',
    choose: 'Upload image', reset: 'Use default', focus: 'Image focal point', positions: ['Centre', 'Top', 'Bottom', 'Left', 'Right'],
    visibility: 'Section visibility', visible: 'Show', heroCard: 'Hero route card',
    instagramHelp: 'Up to 6 public Instagram Reel / post links.', addInstagram: 'Add Instagram link',
    save: 'Save all changes', saving: 'Saving...', saved: 'Both language drafts and images saved.', error: 'Could not complete the request. Please try again.',
    dirty: 'You have unsaved changes.', clean: 'Content is up to date.', preview: 'Open homepage', hint: 'Tour page covers and sections: Tour Pages. Tour card copy and images: Tour Content.',
    leave: 'You have unsaved changes. Leave this page?' },
}

type Section = 'hero' | 'tours' | 'why' | 'stories' | 'final'
export default function SiteContentPage() {
  const { language } = useOutletContext<{ language: AdminLanguage }>()
  const { session } = useAuth()
  const accessToken = session?.accessToken
  const [editLanguage, setEditLanguage] = useState<AdminLanguage>('tr')
  const [content, setContent] = useState<HomepageContentDocument | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const busyRef = useRef(false)
  const c = copy[language]
  const dirty = content !== null && JSON.stringify(content) !== savedSnapshot

  useEffect(() => { setPageMetadata({ title: c.title, language, indexable: false }) }, [c.title, language])
  useEffect(() => {
    const controller = new AbortController()
    apiRequest<HomepageContentDocument>('/api/v1/admin/site-content/homepage', { token: accessToken, cache: 'no-store', signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) { const draft = normalizeHomepage(result); setContent(draft); setSavedSnapshot(JSON.stringify(draft)) } })
      .catch(caught => { if (!controller.signal.aborted) setError(caught instanceof ApiError ? caught.message : '') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [accessToken])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    const linkGuard = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.('a')
      if (dirty && anchor && anchor.target !== '_blank' && !window.confirm(c.leave)) { event.preventDefault(); event.stopPropagation() }
    }
    window.addEventListener('beforeunload', warn); document.addEventListener('click', linkGuard, true)
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', linkGuard, true) }
  }, [dirty, c.leave])

  const change = (update: (current: HomepageContentDocument) => HomepageContentDocument) => {
    setContent(current => current ? update(current) : current); setSuccess('')
  }
  const textField = (section: Section, key: string, label: string, multiline = false) => {
    const value = content![editLanguage][section] as unknown as Record<string, string>
    const props = { 'aria-label': label, value: value[key], maxLength: 3000, onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const text = event.target.value
      change(current => ({ ...current, [editLanguage]: { ...current[editLanguage], [section]: { ...current[editLanguage][section], [key]: text } } }))
    } }
    return <label key={key} className={multiline ? 'field-wide' : ''}>{label}{multiline ? <textarea rows={3} {...props} /> : <input {...props} />}</label>
  }
  const extraFields = (group: string) => homepageTextFields.filter(field => field[0] === group).map(field => <label key={field[1]}>
    {field[language === 'tr' ? 2 : 3]}<textarea aria-label={field[language === 'tr' ? 2 : 3]} rows={field[1].includes('tagline') || field[1] === 'story.note' ? 2 : 1} maxLength={field[1] === 'footer.email' ? 200 : 3000}
      value={content![editLanguage].texts![field[1]]} onChange={event => { const value = event.target.value; change(current => ({ ...current,
        [editLanguage]: { ...current[editLanguage], texts: { ...current[editLanguage].texts, [field[1]]: value } } })) }} /></label>)
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!content || busyRef.current) return
    busyRef.current = true; setSaving(true); setError(''); setSuccess('')
    try {
      // Announcements are edited on their own page; keep the saved list instead of this page's copy.
      const latest = await apiRequest<HomepageContentDocument>('/api/v1/admin/site-content/homepage', { token: session!.accessToken, cache: 'no-store' })
      const next = { ...content, announcements: latest.announcements ?? [], instagramUrls: content.instagramUrls.map(url => url.trim()).filter(Boolean) }
      const updated = normalizeHomepage(await apiRequest<HomepageContentDocument>('/api/v1/admin/site-content/homepage', { method: 'PUT', token: session!.accessToken, body: next }))
      setContent(updated); setSavedSnapshot(JSON.stringify(updated)); setSuccess(c.saved)
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : c.error) }
    finally { busyRef.current = false; setSaving(false) }
  }
  const upload = async (key: string, file?: File) => {
    if (!file || busyRef.current) return
    if (file.size <= 0 || file.size > 8 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError(c.imageHelp); return }
    busyRef.current = true; setUploading(key); setError(''); setSuccess('')
    try {
      const data = new FormData(); data.append('file', file)
      const result = await apiUpload<{ url: string }>('/api/v1/admin/site-content/homepage/images', data, session!.accessToken)
      change(current => ({ ...current, images: { ...current.images, [key]: result.url } }))
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : c.error) }
    finally { busyRef.current = false; setUploading(null) }
  }
  if (loading) return <div className="site-content-loading"><span className="button-spinner" /></div>
  if (!content) return <div className="admin-alert" role="alert">{error || c.error}</div>
  const current = content[editLanguage]
  return <>
    <div className="admin-page-heading"><div><span>{language === 'tr' ? 'SİTE YÖNETİMİ' : 'WEBSITE MANAGEMENT'}</span><h1>{c.title}</h1><p>{c.subtitle}</p></div></div>
    <p className="homepage-editor-hint">{c.hint} <a href="/admin/tour-pages">{language === 'tr' ? 'Tur Sayfaları' : 'Tour Pages'}</a> · <a href="/admin/tour-contents">{language === 'tr' ? 'Tur İçerikleri' : 'Tour Content'}</a></p>
    <div className="homepage-editor-status"><span>{dirty ? c.dirty : c.clean}</span><a href="/" target="_blank" rel="noopener noreferrer">{c.preview}<ExternalLink size={15} /></a></div>
    {error && <div className="admin-alert" role="alert">{error}</div>}{success && <div className="admin-alert site-content-success" role="status">{success}</div>}
    <div className="site-content-language-tabs">{(['tr', 'en'] as const).map(item => <button key={item} disabled={saving || !!uploading} className={editLanguage === item ? 'active' : ''} type="button" onClick={() => setEditLanguage(item)}>{item.toUpperCase()} <span>{item === 'tr' ? 'Türkçe içerik' : 'English content'}</span></button>)}</div>
    <form className="site-content-form" onSubmit={save}>
      <fieldset className="homepage-editor-fieldset" disabled={saving || !!uploading}>
        <section><header><ImagePlus /><div><h2>{c.images}</h2><p>{c.imageHelp}</p></div></header><div className="homepage-image-grid">{homepageImages.map(slot => {
          const url = content.images?.[slot.key] || slot.fallback
          return <article key={slot.key} data-image-slot={slot.key}><img src={url.startsWith('/api/') ? `${apiBaseUrl}${url}` : url} style={{ objectPosition: content.imagePositions?.[slot.key] ?? 'center' }} alt={slot[language]} />
            <strong>{slot[language]}</strong><label className="homepage-image-upload"><ImagePlus size={15} />{uploading === slot.key ? c.saving : c.choose}<input aria-label={`${slot[language]} · ${c.choose}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void upload(slot.key, file) }} /></label>
            <button type="button" onClick={() => change(draft => ({ ...draft, images: { ...draft.images, [slot.key]: '' }, imagePositions: { ...draft.imagePositions, [slot.key]: 'center' } }))}>{c.reset}</button>
            <label>{c.focus}<select value={content.imagePositions?.[slot.key] ?? 'center'} onChange={event => { const value = event.target.value; change(draft => ({ ...draft, imagePositions: { ...draft.imagePositions, [slot.key]: value } })) }}>{['center', 'top', 'bottom', 'left', 'right'].map((position, index) => <option key={position} value={position}>{c.positions[index]}</option>)}</select></label>
          </article>
        })}</div></section>
        <section><header><LayoutTemplate /><h2>{c.visibility}</h2></header><div className="homepage-visibility">{(['heroCard', 'marquee', 'why', 'stories', 'final'] as const).map(key => <label key={key}><input type="checkbox" checked={!content.hiddenSections?.includes(key)} onChange={event => { const visible = event.target.checked; change(draft => ({ ...draft, hiddenSections: visible ? draft.hiddenSections!.filter(item => item !== key) : [...draft.hiddenSections!, key] })) }} />{c.visible}: {c[key]}</label>)}</div></section>
        {(['hero', 'tours', 'why', 'stories', 'final'] as const).map(section => <section key={section} data-content-section={section}><header>{section === 'stories' ? <Camera /> : <LayoutTemplate />}<div><h2>{c[section]}</h2></div></header>
          <div className="site-content-fields">
            {/* The tours section has no heading on the site any more; only the card button label is editable. */}
            {section !== 'hero' && section !== 'final' && section !== 'tours' && textField(section, 'eyebrow', c.eyebrow)}
            {section !== 'final' && section !== 'tours' && <>{textField(section, 'lead', c.lead)}{textField(section, 'accent', c.accent)}</>}
            {section !== 'why' && section !== 'final' && section !== 'tours' && textField(section, 'description', c.description, true)}
            {section === 'why' && textField(section, 'reviews', c.reviews)}
            {section === 'stories' && <>{textField(section, 'quote', c.quote, true)}{textField(section, 'meta', c.meta)}</>}
            {section === 'final' && <>{textField(section, 'pre', c.pre)}{textField(section, 'title', c.titleLabel)}{textField(section, 'action', c.action)}</>}
            {extraFields(section)}
          </div>
          {section === 'why' && <div className="site-content-repeat-grid">{current.why.benefits.map((item, index) => <article key={index}><strong>{index + 1}</strong>{(['title', 'description'] as const).map(key => <label key={key}>{key === 'title' ? c.titleLabel : c.description}<textarea rows={key === 'description' ? 3 : 1} maxLength={3000} value={item[key]} onChange={event => { const value = event.target.value; change(draft => ({ ...draft, [editLanguage]: { ...draft[editLanguage], why: { ...draft[editLanguage].why, benefits: draft[editLanguage].why.benefits.map((entry, i) => i === index ? { ...entry, [key]: value } : entry) } } })) }} /></label>)}</article>)}</div>}
          {section === 'stories' && <div className="instagram-url-list"><p>{c.instagramHelp}</p>{content.instagramUrls.map((url, index) => <div key={index}><Camera /><input aria-label={`Instagram ${index + 1}`} type="url" value={url} placeholder="https://www.instagram.com/reel/.../" onChange={event => { const value = event.target.value; change(draft => ({ ...draft, instagramUrls: draft.instagramUrls.map((entry, i) => i === index ? value : entry) })) }} />{url.startsWith('https://') && <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><ExternalLink /></a>}<button type="button" aria-label={language === 'tr' ? 'Bağlantıyı kaldır' : 'Remove link'} onClick={() => change(draft => ({ ...draft, instagramUrls: draft.instagramUrls.filter((_, i) => i !== index) }))}><Trash2 /></button></div>)}{content.instagramUrls.length < 6 && <button type="button" onClick={() => change(draft => ({ ...draft, instagramUrls: [...draft.instagramUrls, ''] }))}><Plus />{c.addInstagram}</button>}</div>}
        </section>)}
        {(['navigation', 'booking', 'marquee', 'footer'] as const).map(group => <section key={group}><header><LayoutTemplate /><h2>{c[group]}</h2></header><div className="site-content-fields">{extraFields(group)}</div></section>)}
      </fieldset>
      <div className="site-content-save"><button className="admin-primary-button" disabled={saving || !!uploading || !dirty} type="submit"><Save />{saving ? c.saving : c.save}</button></div>
    </form>
  </>
}
