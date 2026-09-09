import { Eye, EyeOff, ImageIcon, Images, Pencil, Save, Search, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiBaseUrl, ApiError, apiRequest, apiUpload } from '../lib/api'
import type { AdminLanguage } from './AdminLayout'

type ManagedTourContent = {
  externalTourId: number
  externalCategoryId: number
  categoryKey: 'bosphorus' | 'turkish-night' | 'sunset' | 'daytime'
  categoryName: string
  sourceName: string
  titleTr?: string | null
  titleEn?: string | null
  descriptionTr?: string | null
  descriptionEn?: string | null
  badgeTr?: string | null
  badgeEn?: string | null
  imageUrl?: string | null
  hasCustomImage: boolean
  sortOrder: number
  isVisible: boolean
  isCustomized: boolean
  updatedAtUtc?: string | null
}

const copy = {
  tr: {
    eyebrow: 'KATALOG & İÇERİK', title: 'Tur İçerikleri', subtitle: 'EasyTicket’tan gelen turların sitedeki başlık, açıklama, görsel ve sırasını yönetin.',
    total: 'Toplam tur', customized: 'Düzenlenen', visible: 'Yayında', search: 'Tur veya kategori ara...', edit: 'Düzenle', source: 'EasyTicket kaynağı',
    custom: 'Özel içerik', original: 'Kaynak içerik', hidden: 'Gizli', empty: 'Eşleşen tur bulunamadı.', error: 'Tur içerikleri yüklenemedi.',
    modalTitle: 'Tur içeriğini düzenle', modalText: 'Boş bıraktığınız metinlerde EasyTicket veya varsayılan içerik kullanılır.', titleTr: 'Türkçe başlık',
    titleEn: 'İngilizce başlık', descriptionTr: 'Türkçe açıklama', descriptionEn: 'İngilizce açıklama', badgeTr: 'Türkçe rozet', badgeEn: 'İngilizce rozet',
    order: 'Gösterim sırası', publish: 'Sitede göster', image: 'Kapak görseli', imageHint: 'JPG, PNG veya WebP · en fazla 8 MB', chooseImage: 'Görsel seç',
    removeImage: 'Özel görseli kaldır', removeImageConfirm: 'Özel görsel kaldırılsın mı? Tur varsayılan görseline dönecek.', save: 'Değişiklikleri kaydet', cancel: 'Vazgeç', saving: 'Kaydediliyor...',
  },
  en: {
    eyebrow: 'CATALOGUE & CONTENT', title: 'Tour Content', subtitle: 'Manage the titles, descriptions, images and order of tours supplied by EasyTicket.',
    total: 'Total tours', customized: 'Customized', visible: 'Published', search: 'Search tour or category...', edit: 'Edit', source: 'EasyTicket source',
    custom: 'Custom content', original: 'Source content', hidden: 'Hidden', empty: 'No matching tour found.', error: 'Tour content could not be loaded.',
    modalTitle: 'Edit tour content', modalText: 'EasyTicket or default content is used for text fields you leave blank.', titleTr: 'Turkish title',
    titleEn: 'English title', descriptionTr: 'Turkish description', descriptionEn: 'English description', badgeTr: 'Turkish badge', badgeEn: 'English badge',
    order: 'Display order', publish: 'Show on website', image: 'Cover image', imageHint: 'JPG, PNG or WebP · maximum 8 MB', chooseImage: 'Choose image',
    removeImage: 'Remove custom image', removeImageConfirm: 'Remove the custom image? The tour will return to its default image.', save: 'Save changes', cancel: 'Cancel', saving: 'Saving...',
  },
}

const fallbackImages: Record<ManagedTourContent['categoryKey'], string> = {
  bosphorus: '/assets/hero-bosphorus.webp',
  'turkish-night': '/assets/tour-dinner.webp',
  sunset: '/assets/tour-sunset.webp',
  daytime: '/assets/hero-bosphorus.webp',
}

const imageUrl = (tour: ManagedTourContent) => {
  if (!tour.imageUrl) return fallbackImages[tour.categoryKey]
  return tour.imageUrl.startsWith('/') ? `${apiBaseUrl}${tour.imageUrl}` : tour.imageUrl
}

export default function TourContentsPage() {
  const { language } = useOutletContext<{ language: AdminLanguage }>()
  const { session } = useAuth()
  const [tours, setTours] = useState<ManagedTourContent[]>([])
  const [selected, setSelected] = useState<ManagedTourContent | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const c = copy[language]
  const uploadPreview = useMemo(
    () => imageFile ? URL.createObjectURL(imageFile) : null,
    [imageFile],
  )

  useEffect(() => () => {
    if (uploadPreview) URL.revokeObjectURL(uploadPreview)
  }, [uploadPreview])

  useEffect(() => {
    document.title = `${c.title} — PeremeTours`
  }, [c.title])

  useEffect(() => {
    let active = true
    apiRequest<ManagedTourContent[]>('/api/v1/admin/tour-contents', { token: session!.accessToken })
      .then((result) => { if (active) setTours(result) })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.message : c.error) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [c.error, session])

  const visibleTours = useMemo(() => {
    const locale = language === 'tr' ? 'tr-TR' : 'en-US'
    const normalized = query.trim().toLocaleLowerCase(locale)
    return tours.filter((tour) => !normalized || `${tour.sourceName} ${tour.categoryName} ${tour.titleTr ?? ''} ${tour.titleEn ?? ''}`
      .toLocaleLowerCase(locale)
      .includes(normalized))
  }, [language, query, tours])

  const replaceTour = (updated: ManagedTourContent) => {
    setTours((items) => items
      .map((item) => item.externalTourId === updated.externalTourId ? updated : item)
      .sort((left, right) => left.sortOrder - right.sortOrder))
    setSelected(updated)
  }

  const editTour = (tour: ManagedTourContent) => {
    setError('')
    setImageFile(null)
    setSelected(tour)
  }

  const saveTour = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    setSaving(true)
    setError('')
    const data = new FormData(event.currentTarget)
    try {
      let updated = await apiRequest<ManagedTourContent>(`/api/v1/admin/tour-contents/${selected.externalTourId}`, {
        method: 'PUT',
        token: session!.accessToken,
        body: {
          titleTr: data.get('titleTr'), titleEn: data.get('titleEn'),
          descriptionTr: data.get('descriptionTr'), descriptionEn: data.get('descriptionEn'),
          badgeTr: data.get('badgeTr'), badgeEn: data.get('badgeEn'),
          sortOrder: Number(data.get('sortOrder')), isVisible: data.get('isVisible') === 'on',
        },
      })
      if (imageFile) {
        const upload = new FormData()
        upload.append('file', imageFile)
        updated = await apiUpload<ManagedTourContent>(`/api/v1/admin/tour-contents/${selected.externalTourId}/image`, upload, session!.accessToken)
      }
      replaceTour(updated)
      setSelected(null)
      setImageFile(null)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : c.error)
    } finally {
      setSaving(false)
    }
  }

  const removeImage = async () => {
    if (!selected || !window.confirm(c.removeImageConfirm)) return
    setSaving(true)
    setError('')
    try {
      await apiRequest<void>(`/api/v1/admin/tour-contents/${selected.externalTourId}/image`, { method: 'DELETE', token: session!.accessToken })
      replaceTour({ ...selected, imageUrl: null, hasCustomImage: false, updatedAtUtc: new Date().toISOString() })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : c.error)
    } finally {
      setSaving(false)
    }
  }

  return <>
    <div className="admin-page-heading"><div><span>{c.eyebrow}</span><h1>{c.title}</h1><p>{c.subtitle}</p></div></div>
    <div className="admin-stat-grid admin-stat-grid--three">
      <article><span className="stat-icon stat-icon--blue"><Images /></span><div><small>{c.total}</small><strong>{tours.length}</strong></div></article>
      <article><span className="stat-icon stat-icon--violet"><Pencil /></span><div><small>{c.customized}</small><strong>{tours.filter((tour) => tour.isCustomized).length}</strong></div></article>
      <article><span className="stat-icon stat-icon--green"><Eye /></span><div><small>{c.visible}</small><strong>{tours.filter((tour) => tour.isVisible).length}</strong></div></article>
    </div>
    {error && <div className="admin-alert">{error}</div>}
    <section className="tour-content-panel">
      <div className="admin-table-tools"><label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.search} /></label></div>
      {loading && <div className="tour-content-grid">{Array.from({ length: 6 }).map((_, index) => <div className="tour-content-card tour-content-card--loading" key={index} />)}</div>}
      {!loading && <div className="tour-content-grid">{visibleTours.map((tour) => <article className={`tour-content-card ${!tour.isVisible ? 'tour-content-card--hidden' : ''}`} key={tour.externalTourId}>
        <div className="tour-content-card__image"><img src={imageUrl(tour)} alt="" />{tour.isVisible ? <span><Eye /> {c.visible}</span> : <span><EyeOff /> {c.hidden}</span>}</div>
        <div className="tour-content-card__body"><div><small>{tour.categoryName} · #{tour.externalTourId}</small><h2>{(language === 'tr' ? tour.titleTr : tour.titleEn) || tour.sourceName}</h2></div>
          <p><strong>{c.source}:</strong> {tour.sourceName}</p><div className="tour-content-card__meta"><span>{tour.isCustomized ? c.custom : c.original}</span><b>{c.order}: {tour.sortOrder}</b></div>
          <button type="button" onClick={() => editTour(tour)}><Pencil /> {c.edit}</button>
        </div>
      </article>)}</div>}
      {!loading && visibleTours.length === 0 && <div className="admin-empty"><ImageIcon /><p>{c.empty}</p></div>}
    </section>

    {selected && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setSelected(null) }}>
      <section className="admin-modal tour-editor" role="dialog" aria-modal="true" aria-labelledby="tour-editor-title">
        <button className="admin-modal__close" type="button" disabled={saving} onClick={() => setSelected(null)}><X /></button>
        <div className="admin-modal__heading"><span><ImageIcon /></span><div><h2 id="tour-editor-title">{c.modalTitle}</h2><p>{c.modalText}</p></div></div>
        {error && <div className="admin-alert tour-editor__error">{error}</div>}
        <form key={selected.externalTourId} onSubmit={saveTour}>
          <div className="tour-editor__source field-wide"><small>{c.source}</small><strong>{selected.sourceName}</strong><span>{selected.categoryName} · #{selected.externalTourId}</span></div>
          <label>{c.titleTr}<input name="titleTr" maxLength={200} defaultValue={selected.titleTr ?? ''} placeholder={selected.sourceName} /></label>
          <label>{c.titleEn}<input name="titleEn" maxLength={200} defaultValue={selected.titleEn ?? ''} placeholder={selected.sourceName} /></label>
          <label>{c.badgeTr}<input name="badgeTr" maxLength={80} defaultValue={selected.badgeTr ?? ''} /></label>
          <label>{c.badgeEn}<input name="badgeEn" maxLength={80} defaultValue={selected.badgeEn ?? ''} /></label>
          <label className="field-wide">{c.descriptionTr}<textarea name="descriptionTr" maxLength={3000} rows={4} defaultValue={selected.descriptionTr ?? ''} /></label>
          <label className="field-wide">{c.descriptionEn}<textarea name="descriptionEn" maxLength={3000} rows={4} defaultValue={selected.descriptionEn ?? ''} /></label>
          <div className="tour-editor__settings field-wide"><label>{c.order}<input name="sortOrder" type="number" min={0} max={9999} required defaultValue={selected.sortOrder} /></label><label className="tour-editor__visibility"><input name="isVisible" type="checkbox" defaultChecked={selected.isVisible} /><span>{c.publish}</span></label></div>
          <div className="tour-editor__image field-wide"><img src={uploadPreview ?? imageUrl(selected)} alt="" /><div><strong>{c.image}</strong><small>{c.imageHint}</small><label><Upload /> {c.chooseImage}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} /></label>{selected.hasCustomImage && <button type="button" disabled={saving} onClick={() => void removeImage()}><Trash2 /> {c.removeImage}</button>}</div></div>
          <div className="admin-modal__actions field-wide"><button type="button" disabled={saving} onClick={() => setSelected(null)}>{c.cancel}</button><button className="admin-primary-button" disabled={saving} type="submit"><Save /> {saving ? c.saving : c.save}</button></div>
        </form>
      </section>
    </div>}
  </>
}
