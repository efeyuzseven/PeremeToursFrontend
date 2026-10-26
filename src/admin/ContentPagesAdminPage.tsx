import { ArrowLeft, Eye, FileText, ImagePlus, Newspaper, PencilLine, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError, apiRequest, apiUpload } from '../lib/api'
import { contentImage, contentPath, slugify, type ContentKind, type ContentLanguage, type ContentPageSummary } from '../lib/content-pages'
import { sanitizeHtml } from '../lib/html'
import { setPageMetadata, SITE_NAME } from '../lib/site'
import type { AdminLanguage } from './AdminLayout'
import '../pages/content-pages.css'
import './content-pages-admin.css'

type DraftText = { title: string; slug: string; summary: string; body: string; metaTitle: string; metaDescription: string }
type Draft = { id?: string; isPublished: boolean; publishedAt: string; coverImageUrl: string | null; showInFooter: boolean; sortOrder: number; tr: DraftText; en: DraftText }

const emptyText: DraftText = { title: '', slug: '', summary: '', body: '', metaTitle: '', metaDescription: '' }

const copy = {
  tr: {
    blog: { title: 'Blog', subtitle: 'Blog yazılarını Türkçe / İngilizce yazın; adres (slug) başlıktan otomatik oluşur.', add: 'Yeni yazı', empty: 'Henüz blog yazısı yok.', item: 'yazı' },
    page: { title: 'Sayfalar', subtitle: 'Sitede pereme.com.tr/sayfa-adi adresinde açılan ek sayfalar oluşturun (Hakkımızda, kampanya sayfası vb.).', add: 'Yeni sayfa', empty: 'Henüz sayfa yok.', item: 'sayfa' },
    eyebrow: 'İÇERİK YÖNETİMİ', back: 'Listeye dön', headTitle: 'Başlık', address: 'Adres', status: 'Durum', date: 'Tarih', languages: 'Dil',
    draft: 'Taslak', live: 'Yayında', scheduled: 'Planlandı', edit: 'Düzenle', remove: 'Sil', removeConfirm: 'Bu içerik kalıcı olarak silinsin mi?',
    titleLabel: 'Başlık', slug: 'Adres (slug)', slugHelp: 'Boş bırakırsanız başlıktan oluşturulur. Yayındaki bir adresi değiştirmek eski bağlantıları bozar.',
    summary: 'Özet', summaryHelp: 'Blog listesinde ve paylaşımlarda görünen kısa açıklama.', body: 'İçerik (HTML)', bodyHelp: 'HTML yazabilirsiniz: <h2>, <p>, <ul>, <img>, <a>, <table>… Güvenlik için script, form, iframe ve <style> otomatik silinir.',
    preview: 'Önizleme', write: 'Düzenle', seo: 'Arama motoru (SEO)', metaTitle: 'SEO başlığı', metaDescription: 'SEO açıklaması', metaHelp: 'Boş bırakılırsa başlık ve özet kullanılır.',
    googlePreview: 'Google önizlemesi', enHelp: 'İngilizce isteğe bağlıdır. Başlık ve içerik girilmezse içerik yalnızca Türkçe yayınlanır.',
    settings: 'Yayın', published: 'Yayında', publishedAt: 'Yayın tarihi', publishedAtHelp: 'İleri bir tarih seçerseniz o zaman yayına girer. Boşsa yayınladığınız an kullanılır.',
    cover: 'Kapak görseli', coverHelp: 'JPG, PNG veya WebP · En fazla 8 MB.', upload: 'Görsel yükle', removeCover: 'Görseli kaldır',
    footer: 'Alt bilgide göster', sortOrder: 'Sıra', save: 'Kaydet', saving: 'Kaydediliyor…', saved: 'Kaydedildi.', view: 'Sitede aç',
    error: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.', loadError: 'İçerikler yüklenemedi.', titleRequired: 'Türkçe başlık ve içerik zorunludur.',
    unsaved: 'Kaydedilmemiş değişiklikler var. Çıkmak istiyor musunuz?',
  },
  en: {
    blog: { title: 'Blog', subtitle: 'Write blog posts in Turkish / English; the address (slug) is created from the title.', add: 'New post', empty: 'No blog posts yet.', item: 'post' },
    page: { title: 'Pages', subtitle: 'Create extra pages that open at pereme.com.tr/page-name (About us, campaign pages, etc.).', add: 'New page', empty: 'No pages yet.', item: 'page' },
    eyebrow: 'CONTENT MANAGEMENT', back: 'Back to list', headTitle: 'Title', address: 'Address', status: 'Status', date: 'Date', languages: 'Language',
    draft: 'Draft', live: 'Published', scheduled: 'Scheduled', edit: 'Edit', remove: 'Delete', removeConfirm: 'Delete this content permanently?',
    titleLabel: 'Title', slug: 'Address (slug)', slugHelp: 'Left empty, it is created from the title. Changing a published address breaks old links.',
    summary: 'Summary', summaryHelp: 'Short description shown in the blog list and when shared.', body: 'Content (HTML)', bodyHelp: 'You can write HTML: <h2>, <p>, <ul>, <img>, <a>, <table>… Scripts, forms, iframes and <style> are removed for safety.',
    preview: 'Preview', write: 'Edit', seo: 'Search engines (SEO)', metaTitle: 'SEO title', metaDescription: 'SEO description', metaHelp: 'Left empty, the title and summary are used.',
    googlePreview: 'Google preview', enHelp: 'English is optional. Without a title and content the item is published in Turkish only.',
    settings: 'Publishing', published: 'Published', publishedAt: 'Publish date', publishedAtHelp: 'A future date publishes it then. Empty uses the moment you publish.',
    cover: 'Cover image', coverHelp: 'JPG, PNG or WebP · Up to 8 MB.', upload: 'Upload image', removeCover: 'Remove image',
    footer: 'Show in footer', sortOrder: 'Order', save: 'Save', saving: 'Saving…', saved: 'Saved.', view: 'Open on site',
    error: 'Could not complete the request. Please try again.', loadError: 'Content could not be loaded.', titleRequired: 'A Turkish title and content are required.',
    unsaved: 'You have unsaved changes. Leave anyway?',
  },
}

// <input type="datetime-local"> works in local time; the API stores UTC.
const toLocalInput = (value: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
const toDraftText = (text: ContentPageSummary['tr'] | null): DraftText => text
  ? { title: text.title, slug: text.slug, summary: text.summary ?? '', body: text.body, metaTitle: text.metaTitle ?? '', metaDescription: text.metaDescription ?? '' }
  : { ...emptyText }
const toDraft = (item: ContentPageSummary): Draft => ({ id: item.id, isPublished: item.isPublished, publishedAt: toLocalInput(item.publishedAtUtc),
  coverImageUrl: item.coverImageUrl, showInFooter: item.showInFooter, sortOrder: item.sortOrder, tr: toDraftText(item.tr), en: toDraftText(item.en) })
const toRequestText = (text: DraftText) => ({ title: text.title.trim(), slug: text.slug.trim() || null, summary: text.summary.trim() || null, body: text.body,
  metaTitle: text.metaTitle.trim() || null, metaDescription: text.metaDescription.trim() || null })

export default function ContentPagesAdminPage({ kind }: { kind: ContentKind }) {
  const { language } = useOutletContext<{ language: AdminLanguage }>()
  const { session } = useAuth()
  const token = session!.accessToken
  const c = copy[language]
  const k = c[kind]
  const [items, setItems] = useState<ContentPageSummary[] | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [savedDraft, setSavedDraft] = useState('')
  const [editLanguage, setEditLanguage] = useState<ContentLanguage>('tr')
  const [preview, setPreview] = useState(false)
  // Slugs follow the title until the editor types one (or the item was already saved).
  const [slugTouched, setSlugTouched] = useState({ tr: false, en: false })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const busy = useRef(false)
  // "Scheduled" is judged against when the page was opened (render must not read the clock).
  const [openedAt] = useState(() => Date.now())
  const dirty = draft !== null && JSON.stringify(draft) !== savedDraft

  useEffect(() => { setPageMetadata({ title: k.title, language, indexable: false }) }, [k.title, language])
  useEffect(() => {
    const controller = new AbortController()
    apiRequest<ContentPageSummary[]>(`/api/v1/admin/content-pages?kind=${kind}`, { token, signal: controller.signal, cache: 'no-store' })
      .then(result => { if (!controller.signal.aborted) setItems(result) })
      .catch(caught => { if (!controller.signal.aborted) setError(caught instanceof ApiError ? caught.message : c.loadError) })
    return () => controller.abort()
  }, [kind, token, c.loadError])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const open = (next: Draft, touched: boolean) => {
    setDraft(next); setSavedDraft(JSON.stringify(next)); setEditLanguage('tr'); setPreview(false)
    setSlugTouched({ tr: touched, en: touched && !!next.en.slug }); setError(''); setSuccess('')
  }
  const close = () => { if (!dirty || window.confirm(c.unsaved)) { setDraft(null); setError(''); setSuccess('') } }
  const change = (update: (current: Draft) => Draft) => { setDraft(current => current ? update(current) : current); setSuccess('') }
  const setText = (key: keyof DraftText, value: string) => change(current => {
    const text = { ...current[editLanguage], [key]: value }
    if (key === 'title' && !slugTouched[editLanguage]) text.slug = slugify(value)
    return { ...current, [editLanguage]: text }
  })

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft || busy.current) return
    if (!draft.tr.title.trim() || !draft.tr.body.trim()) { setError(c.titleRequired); setEditLanguage('tr'); return }
    busy.current = true; setSaving(true); setError(''); setSuccess('')
    const body = { kind, isPublished: draft.isPublished, publishedAtUtc: draft.publishedAt ? new Date(draft.publishedAt).toISOString() : null,
      coverImageUrl: draft.coverImageUrl, showInFooter: draft.showInFooter, sortOrder: draft.sortOrder,
      tr: toRequestText(draft.tr), en: draft.en.title.trim() ? toRequestText(draft.en) : null }
    try {
      const result = await apiRequest<ContentPageSummary>(draft.id ? `/api/v1/admin/content-pages/${draft.id}` : '/api/v1/admin/content-pages',
        { method: draft.id ? 'PUT' : 'POST', token, body })
      setItems(current => current ? (draft.id ? current.map(item => item.id === result.id ? result : item) : [result, ...current]) : [result])
      const next = toDraft(result)
      setDraft(next); setSavedDraft(JSON.stringify(next)); setSlugTouched({ tr: true, en: !!next.en.slug }); setSuccess(c.saved)
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : c.error) }
    finally { busy.current = false; setSaving(false) }
  }
  const remove = async (item: ContentPageSummary) => {
    if (busy.current || !window.confirm(c.removeConfirm)) return
    busy.current = true
    try {
      await apiRequest<void>(`/api/v1/admin/content-pages/${item.id}`, { method: 'DELETE', token })
      setItems(current => current?.filter(entry => entry.id !== item.id) ?? null)
      if (draft?.id === item.id) setDraft(null)
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : c.error) }
    finally { busy.current = false }
  }
  const uploadCover = async (file?: File) => {
    if (!file || busy.current) return
    if (file.size <= 0 || file.size > 8 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError(c.coverHelp); return }
    busy.current = true; setUploading(true); setError('')
    try {
      const data = new FormData(); data.append('file', file)
      const result = await apiUpload<{ url: string }>('/api/v1/admin/site-content/homepage/images', data, token)
      change(current => ({ ...current, coverImageUrl: result.url }))
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : c.error) }
    finally { busy.current = false; setUploading(false) }
  }

  const status = (item: ContentPageSummary) => !item.isPublished ? c.draft
    : item.publishedAtUtc && new Date(item.publishedAtUtc).getTime() > openedAt ? c.scheduled : c.live
  const text = draft?.[editLanguage]
  const previewHtml = useMemo(() => preview && text ? sanitizeHtml(text.body) : '', [preview, text])

  if (!draft) return <>
    <div className="admin-page-heading"><div><span>{c.eyebrow}</span><h1>{k.title}</h1><p>{k.subtitle}</p></div>
      <button className="admin-primary-button" type="button" onClick={() => open({ isPublished: false, publishedAt: '', coverImageUrl: null, showInFooter: false, sortOrder: 0, tr: { ...emptyText }, en: { ...emptyText } }, false)}><Plus />{k.add}</button></div>
    {error && <div className="admin-alert" role="alert">{error}</div>}
    <section className="admin-table-card content-admin-list">
      {!items ? <div className="site-content-loading"><span className="button-spinner" /></div>
        : items.length === 0 ? <div className="admin-empty">{kind === 'blog' ? <Newspaper /> : <FileText />}<p>{k.empty}</p></div>
        : <div className="admin-table-scroll"><table><thead><tr><th>{c.headTitle}</th><th>{c.address}</th><th>{c.status}</th><th>{c.date}</th><th>{c.languages}</th><th /></tr></thead>
          <tbody>{items.map(item => <tr key={item.id}>
            <td><strong>{item.tr.title}</strong></td>
            <td className="content-admin-slug">{contentPath(kind, 'tr', item.tr.slug)}</td>
            <td><span className={`content-admin-status content-admin-status--${status(item) === c.live ? 'live' : status(item) === c.scheduled ? 'scheduled' : 'draft'}`}>{status(item)}</span></td>
            <td>{item.publishedAtUtc ? new Date(item.publishedAtUtc).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-GB') : '—'}</td>
            <td>{item.en ? 'TR · EN' : 'TR'}</td>
            <td className="content-admin-actions">
              <button type="button" onClick={() => open(toDraft(item), true)}><PencilLine size={15} />{c.edit}</button>
              <button type="button" className="danger" aria-label={c.remove} onClick={() => void remove(item)}><Trash2 size={15} /></button>
            </td>
          </tr>)}</tbody></table></div>}
    </section>
  </>

  const cover = contentImage(draft.coverImageUrl)
  const live = draft.id && items?.find(item => item.id === draft.id)
  const seoTitle = (text!.metaTitle || text!.title || k.add)
  const seoDescription = text!.metaDescription || text!.summary
  return <form className="content-admin-editor" onSubmit={save}>
    <div className="admin-page-heading"><div><button type="button" className="content-admin-back" onClick={close}><ArrowLeft size={15} />{c.back}</button>
      <h1>{draft.tr.title || k.add}</h1></div>
      <div className="content-admin-heading-actions">
        {live && live.isPublished && <a href={contentPath(kind, 'tr', live.tr.slug)} target="_blank" rel="noopener noreferrer"><Eye size={15} />{c.view}</a>}
        <button className="admin-primary-button" type="submit" disabled={saving || uploading || !dirty}><Save />{saving ? c.saving : c.save}</button>
      </div></div>
    {error && <div className="admin-alert" role="alert">{error}</div>}{success && <div className="admin-alert site-content-success" role="status">{success}</div>}
    <div className="content-admin-layout">
      <div className="content-admin-main">
        <div className="site-content-language-tabs">{(['tr', 'en'] as const).map(item => <button key={item} type="button" className={editLanguage === item ? 'active' : ''} onClick={() => { setEditLanguage(item); setPreview(false) }}>{item.toUpperCase()} <span>{item === 'tr' ? 'Türkçe' : 'English'}</span></button>)}</div>
        {editLanguage === 'en' && <p className="content-admin-help">{c.enHelp}</p>}
        <section className="content-admin-card">
          <label>{c.titleLabel}<input maxLength={200} value={text!.title} onChange={event => setText('title', event.target.value)} /></label>
          <label>{c.slug}<div className="content-admin-slug-input"><span>pereme.com.tr{contentPath(kind, editLanguage, '').replace(/\/$/, '')}/</span>
            <input maxLength={120} value={text!.slug} onChange={event => { setSlugTouched(current => ({ ...current, [editLanguage]: true })); setText('slug', event.target.value) }}
              onBlur={() => setText('slug', slugify(text!.slug))} /></div><small>{c.slugHelp}</small></label>
          <label>{c.summary}<textarea rows={3} maxLength={500} value={text!.summary} onChange={event => setText('summary', event.target.value)} /><small>{c.summaryHelp}</small></label>
          <div className="content-admin-body">
            <div className="content-admin-body__head"><span>{c.body}</span>
              <button type="button" onClick={() => setPreview(value => !value)}>{preview ? <><PencilLine size={14} />{c.write}</> : <><Eye size={14} />{c.preview}</>}</button></div>
            {preview ? <div className="content-admin-preview content-body" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              : <textarea rows={22} maxLength={100000} spellCheck value={text!.body} onChange={event => setText('body', event.target.value)} placeholder="<h2>…</h2>&#10;<p>…</p>" />}
            <small>{c.bodyHelp}</small>
          </div>
        </section>
        <section className="content-admin-card">
          <h2>{c.seo}</h2>
          <label>{c.metaTitle} <em>{text!.metaTitle.length}/60</em><input maxLength={70} value={text!.metaTitle} placeholder={text!.title} onChange={event => setText('metaTitle', event.target.value)} /></label>
          <label>{c.metaDescription} <em>{text!.metaDescription.length}/160</em><textarea rows={3} maxLength={200} value={text!.metaDescription} placeholder={text!.summary} onChange={event => setText('metaDescription', event.target.value)} /><small>{c.metaHelp}</small></label>
          <div className="content-admin-google"><small>{c.googlePreview}</small>
            <span>pereme.com.tr › {contentPath(kind, editLanguage, text!.slug || '…').split('/').filter(Boolean).join(' › ')}</span>
            <strong>{seoTitle} — {SITE_NAME}</strong><p>{seoDescription || '…'}</p></div>
        </section>
      </div>
      <aside className="content-admin-side">
        <section className="content-admin-card">
          <h2>{c.settings}</h2>
          <label className="content-admin-check"><input type="checkbox" checked={draft.isPublished} onChange={event => { const value = event.target.checked; change(current => ({ ...current, isPublished: value })) }} />{c.published}</label>
          <label>{c.publishedAt}<input type="datetime-local" value={draft.publishedAt} onChange={event => { const value = event.target.value; change(current => ({ ...current, publishedAt: value })) }} /><small>{c.publishedAtHelp}</small></label>
          {kind === 'page' && <>
            <label className="content-admin-check"><input type="checkbox" checked={draft.showInFooter} onChange={event => { const value = event.target.checked; change(current => ({ ...current, showInFooter: value })) }} />{c.footer}</label>
            <label>{c.sortOrder}<input type="number" min={0} max={9999} value={draft.sortOrder} onChange={event => { const value = Number(event.target.value) || 0; change(current => ({ ...current, sortOrder: value })) }} /></label>
          </>}
        </section>
        <section className="content-admin-card">
          <h2>{c.cover}</h2>
          {cover && <img className="content-admin-cover" src={cover} alt="" />}
          <label className="homepage-image-upload"><ImagePlus size={15} />{uploading ? c.saving : c.upload}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void uploadCover(file) }} /></label>
          {cover && <button type="button" className="content-admin-link" onClick={() => change(current => ({ ...current, coverImageUrl: null }))}>{c.removeCover}</button>}
          <small>{c.coverHelp}</small>
        </section>
      </aside>
    </div>
  </form>
}
