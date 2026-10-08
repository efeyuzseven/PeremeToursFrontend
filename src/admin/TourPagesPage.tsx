import { ArrowDown, ArrowUp, ExternalLink, Eye, ImagePlus, LayoutTemplate, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState, type ChangeEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { TourPageContent } from '../components/TourPageContent'
import { categoryImages, categoryLabels, pagePath, resolvePageImage, type TourLanguage, type TourPageDocument, type TourPageItem, type TourPageSection } from '../content/tour-pages'
import { ApiError, apiRequest, apiUpload } from '../lib/api'
import { setPageMetadata } from '../lib/site'
import type { AdminLanguage } from './AdminLayout'
import './tour-page-editor.css'

const copy = {
  tr: {
    title: 'Tur Sayfaları', subtitle: 'Hizmet ve tur detay sayfalarını Türkçe / İngilizce düzenleyin. Fiyat ve seferler EasyTicket’tan gelmeye devam eder.',
    page: 'Düzenlenecek sayfa', categories: 'Hizmet sayfaları', tours: 'Tur detay sayfaları', editor: 'Düzenle', preview: 'Canlı önizleme', view: 'Yayındaki sayfa',
    save: 'Sayfayı kaydet', saving: 'Kaydediliyor…', saved: 'Sayfa kaydedildi ve yayına yansıdı.', error: 'Tur sayfaları yüklenemedi.', retry: 'Tekrar dene',
    unsaved: 'Kaydedilmemiş değişiklikler', confirm: 'Kaydedilmemiş değişiklikler var. Sayfayı değiştirmek istiyor musunuz?',
    hero: 'Kapak alanı', cover: 'Tam genişlik kapak', split: 'Görsel / metin yan yana', layout: 'Kapak düzeni', image: 'Kapak görseli',
    choose: 'Görsel yükle', imageHint: 'JPG, PNG veya WebP · en fazla 8 MB', url: 'Görsel bağlantısı', default: 'Varsayılan görsel',
    eyebrow: 'Üst etiket', heading: 'Başlık', intro: 'Giriş açıklaması', booking: 'Rezervasyon butonu', related: 'İlgili turlar başlığı', seo: 'Arama motoru açıklaması',
    sections: 'İçerik bölümleri', sectionHint: 'Bölümleri ekleyin, sıralayın veya gizleyin. Görseller ve düzen iki dilde ortaktır; metinler ayrı saklanır.',
    text: 'Metin', highlights: 'Öne çıkanlar', gallery: 'Galeri', add: 'Bölüm ekle', remove: 'Bölümü kaldır', removeConfirm: 'Bu bölüm taslaktan kaldırılsın mı?',
    up: 'Yukarı taşı', down: 'Aşağı taşı', visible: 'Bölümü göster', background: 'Arka plan', white: 'Beyaz', blue: 'Açık mavi', body: 'Açıklama',
    items: 'Öne çıkan maddeler (her satıra bir madde)', galleryHint: 'En fazla 6 görsel. Yüklenen görseller kaydedince yayınlanır.', addImage: 'Galeriye görsel ekle',
    removeImage: 'Görseli kaldır', uploadError: 'Görsel yüklenemedi.', invalidImage: 'JPG, PNG veya WebP seçin; dosya en fazla 8 MB olmalıdır.',
    previewHint: 'Kaydedilmemiş taslağın önizlemesidir. Rezervasyon butonu önizlemede kapalıdır.',
  },
  en: {
    title: 'Tour Pages', subtitle: 'Edit service and tour detail pages in Turkish / English. Prices and departures remain supplied by EasyTicket.',
    page: 'Page to edit', categories: 'Service pages', tours: 'Tour detail pages', editor: 'Edit', preview: 'Live preview', view: 'Published page',
    save: 'Save page', saving: 'Saving…', saved: 'Page saved and published.', error: 'Tour pages could not be loaded.', retry: 'Try again',
    unsaved: 'Unsaved changes', confirm: 'You have unsaved changes. Do you want to switch pages?',
    hero: 'Hero section', cover: 'Full-width cover', split: 'Image / text side by side', layout: 'Hero layout', image: 'Cover image',
    choose: 'Upload image', imageHint: 'JPG, PNG or WebP · maximum 8 MB', url: 'Image URL', default: 'Default image',
    eyebrow: 'Eyebrow', heading: 'Title', intro: 'Introduction', booking: 'Booking button', related: 'Related tours heading', seo: 'Search engine description',
    sections: 'Content sections', sectionHint: 'Add, reorder or hide sections. Images and layout are shared; each language has its own text.',
    text: 'Text', highlights: 'Highlights', gallery: 'Gallery', add: 'Add section', remove: 'Remove section', removeConfirm: 'Remove this section from the draft?',
    up: 'Move up', down: 'Move down', visible: 'Show section', background: 'Background', white: 'White', blue: 'Light blue', body: 'Description',
    items: 'Highlights (one item per line)', galleryHint: 'Up to 6 images. Uploaded images are published when you save.', addImage: 'Add gallery image',
    removeImage: 'Remove image', uploadError: 'Image upload failed.', invalidImage: 'Choose JPG, PNG or WebP, maximum 8 MB.',
    previewHint: 'This is a preview of your unsaved draft. Booking is disabled in preview.',
  },
}

export default function TourPagesPage() {
  const { language } = useOutletContext<{ language: AdminLanguage }>()
  const { session } = useAuth()
  const [pages, setPages] = useState<TourPageItem[]>([])
  const [selectedKey, setSelectedKey] = useState('')
  const [document, setDocument] = useState<TourPageDocument | null>(null)
  const [editLanguage, setEditLanguage] = useState<TourLanguage>('tr')
  const [mode, setMode] = useState<'editor' | 'preview'>('editor')
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [reload, setReload] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const c = copy[language]
  const selected = pages.find(page => page.key === selectedKey)
  const busy = saving || uploading
  useEffect(() => { setPageMetadata({ title: c.title, language, indexable: false }) }, [c.title, language])
  useEffect(() => {
    const controller = new AbortController()
    apiRequest<TourPageItem[]>('/api/v1/admin/tour-pages', { token: session!.accessToken, signal: controller.signal, cache: 'no-store' })
      .then(result => {
        if (controller.signal.aborted) return
        setPages(result); setSelectedKey(result[0]?.key ?? ''); setDocument(result[0] ? structuredClone(result[0].document) : null); setError('')
      })
      .catch(caught => { if (!controller.signal.aborted) setError(caught instanceof ApiError ? caught.message : copy.tr.error) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [session, reload])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const change = (update: (current: TourPageDocument) => TourPageDocument) => {
    setDocument(current => current ? update(current) : current); setDirty(true); setSuccess('')
  }
  const choosePage = (key: string) => {
    if (dirty && !window.confirm(c.confirm)) return
    const item = pages.find(page => page.key === key)
    setSelectedKey(key); setDocument(item ? structuredClone(item.document) : null); setDirty(false); setError(''); setSuccess('')
  }
  const updateSection = (id: string, update: (current: TourPageSection) => TourPageSection) => change(current => ({
    ...current, sections: current.sections.map(section => section.id === id ? update(section) : section),
  }))
  const moveSection = (index: number, direction: -1 | 1) => change(current => {
    const sections = [...current.sections]
    ;[sections[index], sections[index + direction]] = [sections[index + direction], sections[index]]
    return { ...current, sections }
  })
  const addSection = (type: TourPageSection['type']) => change(current => ({ ...current, sections: [...current.sections, {
    id: crypto.randomUUID(), type, background: 'white', isVisible: true, imageUrls: [],
    tr: { title: 'Yeni bölüm', body: '', items: [] }, en: { title: 'New section', body: '', items: [] },
  }] }))
  const upload = async (event: ChangeEvent<HTMLInputElement>, sectionId?: string) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !selected) return
    if (file.size > 8 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError(c.invalidImage); return }
    setUploading(true); setError('')
    const data = new FormData(); data.append('file', file)
    try {
      const result = await apiUpload<{ url: string }>(`/api/v1/admin/tour-pages/${selected.key}/images`, data, session!.accessToken)
      if (sectionId) updateSection(sectionId, section => ({ ...section, imageUrls: [...section.imageUrls, result.url] }))
      else change(current => ({ ...current, heroImageUrl: result.url }))
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : c.uploadError) }
    finally { setUploading(false) }
  }
  const save = async () => {
    if (!selected || !document) return
    setSaving(true); setError(''); setSuccess('')
    try {
      const updated = await apiRequest<TourPageItem>(`/api/v1/admin/tour-pages/${selected.key}`, { method: 'PUT', token: session!.accessToken, body: document })
      setPages(current => current.map(page => page.key === updated.key ? updated : page))
      setDocument(structuredClone(updated.document)); setDirty(false); setSuccess(c.saved)
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : c.error) }
    finally { setSaving(false) }
  }
  const pageLabel = (page: TourPageItem) => page.externalTourId ? `${page.sourceName} · #${page.externalTourId}` : categoryLabels[page.categoryKey][language]
  return <>
    <div className="admin-page-heading"><div><span>PEREME · CMS</span><h1>{c.title}</h1><p>{c.subtitle}</p></div></div>
    {error && <div className="admin-alert" role="alert">{error}</div>}
    {success && <div className="admin-alert site-content-success" role="status">{success}</div>}
    {loading ? <div className="site-content-loading"><span className="button-spinner" /></div> : !selected || !document ? <button type="button" className="admin-primary-button" onClick={() => { setLoading(true); setReload(value => value + 1) }}>{c.retry}</button> : <>
      <div className="tour-page-editor-toolbar">
        <label>{c.page}<select value={selectedKey} disabled={busy} onChange={event => choosePage(event.target.value)}>
          <optgroup label={c.categories}>{pages.filter(page => !page.externalTourId).map(page => <option key={page.key} value={page.key}>{pageLabel(page)}</option>)}</optgroup>
          <optgroup label={c.tours}>{pages.filter(page => page.externalTourId).map(page => <option key={page.key} value={page.key}>{pageLabel(page)}</option>)}</optgroup>
        </select></label>
        <a href={pagePath(selected)} target="_blank" rel="noreferrer">{c.view}<ExternalLink size={15} /></a>
        <button className="admin-primary-button" type="button" disabled={busy || !dirty} onClick={() => void save()}><Save size={16} />{saving ? c.saving : c.save}</button>
      </div>
      <div className="tour-page-editor-tabs">
        <div role="group" aria-label="Content language">{(['tr', 'en'] as const).map(item => <button type="button" key={item} className={editLanguage === item ? 'active' : ''} onClick={() => setEditLanguage(item)}>{item.toUpperCase()}</button>)}</div>
        <div>{(['editor', 'preview'] as const).map(item => <button key={item} type="button" className={mode === item ? 'active' : ''} onClick={() => setMode(item)}>{item === 'editor' ? <LayoutTemplate size={15} /> : <Eye size={15} />}{c[item]}</button>)}</div>
        {dirty && <small>{c.unsaved}</small>}
      </div>
      {mode === 'preview' ? <div className="tour-page-editor-preview"><p>{c.previewHint} · {editLanguage.toUpperCase()}</p><TourPageContent page={{ ...selected, document }} language={editLanguage} onBook={() => undefined} bookingDisabled /></div> : <fieldset className="tour-page-editor-fields" disabled={busy}>
        <section className="tour-page-editor-section"><header><LayoutTemplate size={20} /><h2>{c.hero}</h2></header>
          <div className="tour-page-editor-grid"><label>{c.layout}<select value={document.heroLayout} onChange={event => change(current => ({ ...current, heroLayout: event.target.value as TourPageDocument['heroLayout'] }))}><option value="cover">{c.cover}</option><option value="split">{c.split}</option></select></label>
            <label>{c.eyebrow}<input maxLength={100} value={document[editLanguage].eyebrow} onChange={event => change(current => ({ ...current, [editLanguage]: { ...current[editLanguage], eyebrow: event.target.value } }))} /></label>
            <label className="field-wide">{c.heading}<input maxLength={200} value={document[editLanguage].title} onChange={event => change(current => ({ ...current, [editLanguage]: { ...current[editLanguage], title: event.target.value } }))} /></label>
            <label className="field-wide">{c.intro}<textarea rows={4} maxLength={3000} value={document[editLanguage].intro} onChange={event => change(current => ({ ...current, [editLanguage]: { ...current[editLanguage], intro: event.target.value } }))} /></label>
            <label>{c.booking}<input maxLength={80} value={document[editLanguage].bookingLabel} onChange={event => change(current => ({ ...current, [editLanguage]: { ...current[editLanguage], bookingLabel: event.target.value } }))} /></label>
            <label>{c.related}<input maxLength={200} value={document[editLanguage].toursHeading} onChange={event => change(current => ({ ...current, [editLanguage]: { ...current[editLanguage], toursHeading: event.target.value } }))} /></label>
            <label className="field-wide">{c.seo}<textarea rows={2} maxLength={320} value={document[editLanguage].seoDescription} onChange={event => change(current => ({ ...current, [editLanguage]: { ...current[editLanguage], seoDescription: event.target.value } }))} /></label>
          </div>
          <div className="tour-page-editor-image"><img src={resolvePageImage(document.heroImageUrl || categoryImages[selected.categoryKey])} alt="" /><div><strong>{c.image}</strong><small>{c.imageHint}</small><label className="tour-page-upload"><ImagePlus size={16} />{uploading ? c.saving : c.choose}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void upload(event)} /></label><button type="button" onClick={() => change(current => ({ ...current, heroImageUrl: null }))}>{c.default}</button></div></div>
          <label className="tour-page-editor-url">{c.url}<input value={document.heroImageUrl ?? ''} maxLength={2000} onChange={event => change(current => ({ ...current, heroImageUrl: event.target.value || null }))} /></label>
        </section>
        <div className="tour-page-editor-section-heading"><h2>{c.sections}</h2><p>{c.sectionHint}</p></div>
        {document.sections.map((section, index) => <section className="tour-page-editor-section" key={section.id} data-editor-section={section.id}>
          <header><strong>{String(index + 1).padStart(2, '0')} · {c[section.type]}</strong><div>
            <button type="button" aria-label={c.up} disabled={busy || index === 0} onClick={() => moveSection(index, -1)}><ArrowUp size={16} /></button>
            <button type="button" aria-label={c.down} disabled={busy || index === document.sections.length - 1} onClick={() => moveSection(index, 1)}><ArrowDown size={16} /></button>
            <button type="button" aria-label={c.remove} onClick={() => { if (window.confirm(c.removeConfirm)) change(current => ({ ...current, sections: current.sections.filter(item => item.id !== section.id) })) }}><Trash2 size={16} /></button>
          </div></header>
          <div className="tour-page-editor-grid">
            <label>{c.background}<select value={section.background} onChange={event => updateSection(section.id, item => ({ ...item, background: event.target.value as TourPageSection['background'] }))}><option value="white">{c.white}</option><option value="blue">{c.blue}</option></select></label>
            <label className="tour-page-editor-checkbox"><input type="checkbox" checked={section.isVisible} onChange={event => updateSection(section.id, item => ({ ...item, isVisible: event.target.checked }))} />{c.visible}</label>
            <label className="field-wide">{c.heading}<input maxLength={200} value={section[editLanguage].title} onChange={event => updateSection(section.id, item => ({ ...item, [editLanguage]: { ...item[editLanguage], title: event.target.value } }))} /></label>
            <label className="field-wide">{c.body}<textarea rows={4} maxLength={6000} value={section[editLanguage].body ?? ''} onChange={event => updateSection(section.id, item => ({ ...item, [editLanguage]: { ...item[editLanguage], body: event.target.value } }))} /></label>
            {section.type === 'highlights' && <label className="field-wide">{c.items}<textarea rows={5} maxLength={4812} value={section[editLanguage].items.join('\n')} onChange={event => updateSection(section.id, item => ({ ...item, [editLanguage]: { ...item[editLanguage], items: event.target.value.split('\n') } }))} /></label>}
          </div>
          {section.type === 'gallery' && <div className="tour-page-editor-gallery"><p>{c.galleryHint}</p><div>{section.imageUrls.map((url, imageIndex) => <figure key={`${url}-${imageIndex}`}><img src={resolvePageImage(url)} alt="" /><button type="button" aria-label={c.removeImage} onClick={() => updateSection(section.id, item => ({ ...item, imageUrls: item.imageUrls.filter((_, i) => i !== imageIndex) }))}><Trash2 size={16} /></button></figure>)}</div>
            {section.imageUrls.length < 6 && <label className="tour-page-upload"><ImagePlus size={16} />{c.addImage}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void upload(event, section.id)} /></label>}
          </div>}
        </section>)}
        {document.sections.length < 8 && <div className="tour-page-editor-add">{(['text', 'highlights', 'gallery'] as const).map(type => <button type="button" key={type} onClick={() => addSection(type)}><Plus size={16} />{c.add}: {c[type]}</button>)}</div>}
      </fieldset>}
    </>}
  </>
}
