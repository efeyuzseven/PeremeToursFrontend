import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, Megaphone, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { HomepageAnnouncement, HomepageContentDocument } from '../content/homepage'
import { ApiError, apiBaseUrl, apiRequest, apiUpload } from '../lib/api'
import { setPageMetadata } from '../lib/site'
import type { AdminLanguage } from './AdminLayout'

const copy = {
  tr: { eyebrow: 'SİTE YÖNETİMİ', title: 'Duyurular', subtitle: 'Ana sayfada tur kartlarının altında, bu sırayla görünür. Yayında duyuru yoksa bölüm ve menüdeki “Duyurular” bağlantısı gizlenir.',
    add: 'Duyuru ekle', empty: 'Henüz duyuru yok.', announcement: 'Duyuru', published: 'Yayında', titleLabel: 'Başlık', body: 'Metin',
    date: 'Tarih (isteğe bağlı)', link: 'Bağlantı (isteğe bağlı): https://… veya /tur/3 gibi site içi adres', linkLabel: 'Bağlantı yazısı (boşsa “Detaylar”)',
    image: 'Görsel (isteğe bağlı)', imageHelp: 'JPG, PNG veya WebP · En fazla 8 MB.', choose: 'Görsel yükle', removeImage: 'Görseli kaldır',
    remove: 'Duyuruyu sil', removeConfirm: 'Bu duyuru silinsin mi?', moveUp: 'Yukarı taşı', moveDown: 'Aşağı taşı', titleMissing: 'Türkçe başlık zorunludur.',
    save: 'Duyuruları kaydet', saving: 'Kaydediliyor...', saved: 'Duyurular kaydedildi ve yayına yansıdı.', error: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
    dirty: 'Kaydedilmemiş değişiklikler var.', clean: 'Duyurular güncel.', preview: 'Ana sayfayı aç', leave: 'Kaydedilmemiş değişiklikler var. Sayfadan ayrılmak istiyor musunuz?' },
  en: { eyebrow: 'WEBSITE MANAGEMENT', title: 'Announcements', subtitle: 'Shown on the homepage below the tour cards, in this order. Without a published announcement the section and its menu link are hidden.',
    add: 'Add announcement', empty: 'No announcements yet.', announcement: 'Announcement', published: 'Published', titleLabel: 'Title', body: 'Text',
    date: 'Date (optional)', link: 'Link (optional): https://… or a site path such as /tur/3', linkLabel: 'Link label (defaults to “Details”)',
    image: 'Image (optional)', imageHelp: 'JPG, PNG or WebP · Up to 8 MB.', choose: 'Upload image', removeImage: 'Remove image',
    remove: 'Delete announcement', removeConfirm: 'Delete this announcement?', moveUp: 'Move up', moveDown: 'Move down', titleMissing: 'A Turkish title is required.',
    save: 'Save announcements', saving: 'Saving...', saved: 'Announcements saved and published.', error: 'Could not complete the request. Please try again.',
    dirty: 'You have unsaved changes.', clean: 'Announcements are up to date.', preview: 'Open homepage', leave: 'You have unsaved changes. Leave this page?' },
}
const emptyText = { title: '', body: null, linkLabel: null }
const endpoint = '/api/v1/admin/site-content/homepage'

// Announcements are stored in the homepage content document; only that list is edited here.
export default function AnnouncementsPage() {
  const { language } = useOutletContext<{ language: AdminLanguage }>()
  const { session } = useAuth()
  const accessToken = session?.accessToken
  const [editLanguage, setEditLanguage] = useState<AdminLanguage>('tr')
  const [items, setItems] = useState<HomepageAnnouncement[] | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const busyRef = useRef(false)
  const c = copy[language]
  const dirty = items !== null && JSON.stringify(items) !== savedSnapshot

  useEffect(() => { setPageMetadata({ title: c.title, language, indexable: false }) }, [c.title, language])
  useEffect(() => {
    const controller = new AbortController()
    apiRequest<HomepageContentDocument>(endpoint, { token: accessToken, cache: 'no-store', signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) { const list = result.announcements ?? []; setItems(list); setSavedSnapshot(JSON.stringify(list)) } })
      .catch(caught => { if (!controller.signal.aborted) setError(caught instanceof ApiError ? caught.message : copy.tr.error) })
    return () => controller.abort()
  }, [accessToken])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const linkGuard = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.('a')
      if (anchor && anchor.target !== '_blank' && !window.confirm(c.leave)) { event.preventDefault(); event.stopPropagation() }
    }
    window.addEventListener('beforeunload', warn); document.addEventListener('click', linkGuard, true)
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', linkGuard, true) }
  }, [dirty, c.leave])

  const change = (update: (current: HomepageAnnouncement[]) => HomepageAnnouncement[]) => { setItems(current => current ? update(current) : current); setSuccess('') }
  const edit = (id: string, update: (current: HomepageAnnouncement) => HomepageAnnouncement) => change(list => list.map(item => item.id === id ? update(item) : item))
  const move = (index: number, step: -1 | 1) => change(list => { const next = [...list]; [next[index], next[index + step]] = [next[index + step], next[index]]; return next })
  // The latest homepage document is read right before saving so changes made in Site Content meanwhile are kept.
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!items || busyRef.current) return
    busyRef.current = true; setSaving(true); setError(''); setSuccess('')
    try {
      const latest = await apiRequest<HomepageContentDocument>(endpoint, { token: accessToken, cache: 'no-store' })
      const updated = await apiRequest<HomepageContentDocument>(endpoint, { method: 'PUT', token: accessToken, body: { ...latest, announcements: items } })
      const list = updated.announcements ?? []
      setItems(list); setSavedSnapshot(JSON.stringify(list)); setSuccess(c.saved)
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : c.error) }
    finally { busyRef.current = false; setSaving(false) }
  }
  const upload = async (id: string, file?: File) => {
    if (!file || busyRef.current) return
    if (file.size <= 0 || file.size > 8 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError(c.imageHelp); return }
    busyRef.current = true; setUploading(id); setError(''); setSuccess('')
    try {
      const data = new FormData(); data.append('file', file)
      const result = await apiUpload<{ url: string }>(`${endpoint}/images`, data, accessToken!)
      edit(id, item => ({ ...item, imageUrl: result.url }))
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : c.error) }
    finally { busyRef.current = false; setUploading(null) }
  }

  if (!items) return error ? <div className="admin-alert" role="alert">{error}</div> : <div className="site-content-loading"><span className="button-spinner" /></div>
  return <>
    <div className="admin-page-heading"><div><span>{c.eyebrow}</span><h1>{c.title}</h1><p>{c.subtitle}</p></div></div>
    <div className="homepage-editor-status"><span>{dirty ? c.dirty : c.clean}</span><a href="/#duyurular" target="_blank" rel="noopener noreferrer">{c.preview}<ExternalLink size={15} /></a></div>
    {error && <div className="admin-alert" role="alert">{error}</div>}{success && <div className="admin-alert site-content-success" role="status">{success}</div>}
    <div className="site-content-language-tabs">{(['tr', 'en'] as const).map(item => <button key={item} disabled={saving || !!uploading} className={editLanguage === item ? 'active' : ''} type="button" onClick={() => setEditLanguage(item)}>{item.toUpperCase()} <span>{item === 'tr' ? 'Türkçe içerik' : 'English content'}</span></button>)}</div>
    <form className="site-content-form" onSubmit={save}>
      <fieldset className="homepage-editor-fieldset" disabled={saving || !!uploading}>
        <section data-content-section="announcements">
          {items.length === 0 && <p className="announcement-editor-empty"><Megaphone size={18} />{c.empty}</p>}
          <div className="announcement-editor-list">{items.map((item, index) => {
            const text = item[editLanguage]
            const setText = (key: keyof HomepageAnnouncement['tr'], value: string) => edit(item.id, entry => ({ ...entry, [editLanguage]: { ...entry[editLanguage], [key]: key === 'title' ? value : value || null } }))
            const imageUrl = item.imageUrl ? (item.imageUrl.startsWith('/api/') ? `${apiBaseUrl}${item.imageUrl}` : item.imageUrl) : null
            return <article key={item.id} data-announcement={item.id}>
              <header><strong>{c.announcement} {index + 1}</strong>
                <label className="announcement-editor-published"><input type="checkbox" checked={item.isVisible} onChange={event => { const value = event.target.checked; edit(item.id, entry => ({ ...entry, isVisible: value })) }} />{c.published}</label>
                <div>
                  <button type="button" aria-label={c.moveUp} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={15} /></button>
                  <button type="button" aria-label={c.moveDown} disabled={index === items.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15} /></button>
                  <button type="button" aria-label={c.remove} onClick={() => { if (window.confirm(c.removeConfirm)) change(list => list.filter(entry => entry.id !== item.id)) }}><Trash2 size={15} /></button>
                </div>
              </header>
              <div className="site-content-fields">
                <label className="field-wide">{c.titleLabel}<input maxLength={160} value={text.title} placeholder={editLanguage === 'en' ? item.tr.title : undefined} onChange={event => setText('title', event.target.value)} />
                  {editLanguage === 'tr' && !item.tr.title.trim() && <small className="announcement-editor-error">{c.titleMissing}</small>}</label>
                <label className="field-wide">{c.body}<textarea rows={4} maxLength={1500} value={text.body ?? ''} onChange={event => setText('body', event.target.value)} /></label>
                <label>{c.date}<input type="date" value={item.date ?? ''} onChange={event => { const value = event.target.value; edit(item.id, entry => ({ ...entry, date: value || null })) }} /></label>
                <label>{c.linkLabel}<input maxLength={60} value={text.linkLabel ?? ''} onChange={event => setText('linkLabel', event.target.value)} /></label>
                <label className="field-wide">{c.link}<input maxLength={500} value={item.linkUrl ?? ''} placeholder="https://…" onChange={event => { const value = event.target.value.trim(); edit(item.id, entry => ({ ...entry, linkUrl: value || null })) }} /></label>
              </div>
              <div className="announcement-editor-image">
                {imageUrl && <img src={imageUrl} alt="" />}
                <div><strong>{c.image}</strong>
                  <label className="homepage-image-upload"><ImagePlus size={15} />{uploading === item.id ? c.saving : c.choose}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void upload(item.id, file) }} /></label>
                  {imageUrl && <button type="button" onClick={() => edit(item.id, entry => ({ ...entry, imageUrl: null }))}>{c.removeImage}</button>}
                </div>
              </div>
            </article>
          })}</div>
          {items.length < 12 && <button className="announcement-editor-add" type="button" onClick={() => change(list => [...list, {
            id: crypto.randomUUID(), isVisible: true, date: null, imageUrl: null, linkUrl: null, tr: { ...emptyText }, en: { ...emptyText },
          }])}><Plus />{c.add}</button>}
        </section>
      </fieldset>
      <div className="site-content-save"><button className="admin-primary-button" disabled={saving || !!uploading || !dirty} type="submit"><Save />{saving ? c.saving : c.save}</button></div>
    </form>
  </>
}
