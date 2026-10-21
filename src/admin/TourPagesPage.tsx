import { ArrowDown, ArrowUp, ArrowUpLeft, ExternalLink, Eye, ImagePlus, LayoutTemplate, MapPin, Plus, Save, Trash2 } from 'lucide-react'
import { lazy, Suspense, useEffect, useState, type ChangeEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { TourPageContent } from '../components/TourPageContent'
import { bookingNotesFor, categoryImages, categoryLabels, mapSlots, pagePath, parseCoordinates, resolvePageImage, tourDetailsTemplate, withTextDetails, type TourLanguage,
  type TourPageBookingNote, type TourPageDocument, type TourPageItem, type TourPageMapPoint, type TourPageSection } from '../content/tour-pages'
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
    content: 'Sayfa içeriği', contentLabel: 'İçerik (düz yazı veya HTML)', guideTitle: 'Nasıl yazılır?',
    guide: [['## Başlık', 'Soldaki başlık (örn. ## Dahil olanlar)'], ['- madde', 'Madde işaretli satır'], ['+ madde', 'Yeşil ✓ (dahil olan)'], ['x madde', 'Kırmızı ✕ (dahil olmayan)']] as [string, string][],
    guideNote: 'Diğer satırlar düz metin olarak görünür; boş satır yeni paragraf başlatır. Uzun metinlerde “Daha fazlasını gör” otomatik eklenir.',
    htmlNote: 'HTML: Kutunun ilk karakteri “<” ise içerik HTML olarak gösterilir (örn. <h2>, <p>, <ul>, <table>, <img>, style="…"). Güvenlik için script, form, iframe ve <style> blokları otomatik silinir.',
    previewNote: 'Sonucu “Canlı önizleme” sekmesinden kontrol edebilirsiniz.', template: 'Örnek şablonu ekle',
    galleries: 'Fotoğraf galerisi', galleryHint: 'Görseller sayfada içeriğin en üstünde mozaik olarak görünür. İlk görsel en büyük gösterilir; ilk 4 görsel sayfada görünür, tamamı “Tümünü görüntüle” ile açılır.',
    gallery: 'Galeri', addGallery: 'Galeri ekle', galleryLimit: 'En fazla 6 görsel. Daha fazlası için yeni bir galeri ekleyin.', visible: 'Galeriyi göster',
    remove: 'Galeriyi kaldır', removeConfirm: 'Bu galeri taslaktan kaldırılsın mı?', addImage: 'Görsel ekle', removeImage: 'Görseli kaldır', first: 'Başa al',
    uploadError: 'Görsel yüklenemedi.', invalidImage: 'JPG, PNG veya WebP seçin; dosya en fazla 8 MB olmalıdır.',
    maps: 'Haritalar', mapsHint: 'Doldurduğunuz haritalar sayfada içeriğin en altında bu sırayla görünür: Buluşma noktası, Güzergah, Servis noktası. Boş bıraktıklarınız görünmez.',
    removeMap: 'Haritayı kaldır', removeMapConfirm: 'Bu harita ve açıklaması taslaktan kaldırılsın mı?', mapVisible: 'Haritayı göster',
    mapDescription: 'Açıklama (isteğe bağlı)', points: 'Noktalar', pointName: 'Ad', pointNote: 'Kısa not (örn. Gezi)', pointLocation: 'Konum',
    addPoint: 'Nokta ekle', addPointLabel: 'Koordinat veya Google Haritalar bağlantısı yapıştırın', invalidLocation: 'Konum anlaşılamadı. Örnek: 41.0335, 29.0066',
    mapHelp: 'Önizleme haritasına tıklayarak nokta ekleyin ya da Google Haritalar’da yere sağ tıklayıp en üstteki koordinatlara tıklayın (kopyalanır) ve aşağıya yapıştırın.',
    routeHelp: 'Güzergahta noktalar bu sırayla çizgiyle birleştirilir; ilk nokta başlangıçtır.',
    up: 'Yukarı taşı', down: 'Aşağı taşı', removePoint: 'Noktayı sil', newPoint: (index: number) => `Nokta ${index}`,
    previewHint: 'Kaydedilmemiş taslağın önizlemesidir. Rezervasyon butonu önizlemede kapalıdır.',
    notes: 'Rezervasyon kartı', notesHint: 'Sağdaki sabit kartta fiyatın ve rezervasyon butonunun altında görünen kısa bilgiler (en fazla 4). Başlangıç fiyatı ve tarihler EasyTicket’tan canlı gelir.',
    noteTitle: 'Başlık', noteText: 'Açıklama', addNote: 'Not ekle', removeNote: 'Notu kaldır',
  },
  en: {
    title: 'Tour Pages', subtitle: 'Edit service and tour detail pages in Turkish / English. Prices and departures remain supplied by EasyTicket.',
    page: 'Page to edit', categories: 'Service pages', tours: 'Tour detail pages', editor: 'Edit', preview: 'Live preview', view: 'Published page',
    save: 'Save page', saving: 'Saving…', saved: 'Page saved and published.', error: 'Tour pages could not be loaded.', retry: 'Try again',
    unsaved: 'Unsaved changes', confirm: 'You have unsaved changes. Do you want to switch pages?',
    hero: 'Hero section', cover: 'Full-width cover', split: 'Image / text side by side', layout: 'Hero layout', image: 'Cover image',
    choose: 'Upload image', imageHint: 'JPG, PNG or WebP · maximum 8 MB', url: 'Image URL', default: 'Default image',
    eyebrow: 'Eyebrow', heading: 'Title', intro: 'Introduction', booking: 'Booking button', related: 'Related tours heading', seo: 'Search engine description',
    content: 'Page content', contentLabel: 'Content (plain text or HTML)', guideTitle: 'How to write',
    guide: [['## Heading', 'Heading on the left (e.g. ## Includes)'], ['- item', 'Bullet point'], ['+ item', 'Green ✓ (included)'], ['x item', 'Red ✕ (not included)']] as [string, string][],
    guideNote: 'Other lines appear as plain text; a blank line starts a new paragraph. Long text gets “See more” automatically.',
    htmlNote: 'HTML: if the first character is “<”, the content is shown as HTML (e.g. <h2>, <p>, <ul>, <table>, <img>, style="…"). Scripts, forms, iframes and <style> blocks are removed for safety.',
    previewNote: 'Check the result in the “Live preview” tab.', template: 'Insert example template',
    galleries: 'Photo gallery', galleryHint: 'Images appear as a mosaic above the content. The first image is the largest; the first 4 are shown and all open with “View all”.',
    gallery: 'Gallery', addGallery: 'Add gallery', galleryLimit: 'Up to 6 images. Add another gallery for more.', visible: 'Show gallery',
    remove: 'Remove gallery', removeConfirm: 'Remove this gallery from the draft?', addImage: 'Add image', removeImage: 'Remove image', first: 'Move to first',
    uploadError: 'Image upload failed.', invalidImage: 'Choose JPG, PNG or WebP, maximum 8 MB.',
    maps: 'Maps', mapsHint: 'Filled-in maps appear at the bottom of the page content in this order: meeting point, route, shuttle point. Empty ones are not shown.',
    removeMap: 'Remove map', removeMapConfirm: 'Remove this map and its description from the draft?', mapVisible: 'Show map',
    mapDescription: 'Description (optional)', points: 'Points', pointName: 'Name', pointNote: 'Short note (e.g. Visit)', pointLocation: 'Location',
    addPoint: 'Add point', addPointLabel: 'Paste coordinates or a Google Maps link', invalidLocation: 'Location not recognised. Example: 41.0335, 29.0066',
    mapHelp: 'Click the preview map to add a point, or right-click a place in Google Maps, click the coordinates at the top (they are copied) and paste them below.',
    routeHelp: 'Route points are connected in this order; the first point is the start.',
    up: 'Move up', down: 'Move down', removePoint: 'Remove point', newPoint: (index: number) => `Point ${index}`,
    previewHint: 'This is a preview of your unsaved draft. Booking is disabled in preview.',
    notes: 'Booking card', notesHint: 'Short notes shown under the price and booking button in the sticky card (up to 4). The starting price and dates load live from EasyTicket.',
    noteTitle: 'Title', noteText: 'Description', addNote: 'Add note', removeNote: 'Remove note',
  },
}

const TourMap = lazy(() => import('../components/TourMap'))
type MapSlot = (typeof mapSlots)[number]
type Copy = (typeof copy)[AdminLanguage]

const formatCoordinates = (point: TourPageMapPoint) => `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`

// Coordinates are edited as text and only applied once they parse, so half-typed values are not lost.
// The caller keys this by the saved coordinates, so a new location resets the draft.
function PointLocation({ point, label, invalid, onChange }: { point: TourPageMapPoint; label: string; invalid: string; onChange: (value: { latitude: number; longitude: number }) => void }) {
  const [draft, setDraft] = useState(() => formatCoordinates(point))
  const [error, setError] = useState(false)
  const apply = () => { const parsed = parseCoordinates(draft); if (parsed) onChange(parsed); else setError(true) }
  return <label>{label}<input value={draft} onChange={event => { setDraft(event.target.value); setError(false) }} onBlur={apply}
    onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); apply() } }} aria-invalid={error} />{error && <small className="tour-page-editor-hint--error">{invalid}</small>}</label>
}

function MapSlotEditor({ slot, section, language, editLanguage, update, remove }: {
  slot: MapSlot; section?: TourPageSection; language: AdminLanguage; editLanguage: TourLanguage
  update: (change: (current: TourPageSection) => TourPageSection) => void; remove: () => void
}) {
  const c: Copy = copy[language]
  const [location, setLocation] = useState('')
  const [locationError, setLocationError] = useState(false)
  const points = section?.mapPoints ?? []
  const setPoints = (change: (current: TourPageMapPoint[]) => TourPageMapPoint[]) => update(item => ({ ...item, mapPoints: change(item.mapPoints ?? []) }))
  const addPoint = (latitude: number, longitude: number) => setPoints(current => [...current, { latitude, longitude, nameTr: c.newPoint(current.length + 1) }])
  const editPoint = (index: number, change: Partial<TourPageMapPoint>) => setPoints(current => current.map((point, i) => i === index ? { ...point, ...change } : point))
  const movePoint = (index: number, step: -1 | 1) => setPoints(current => {
    const next = [...current]; [next[index], next[index + step]] = [next[index + step], next[index]]; return next
  })
  const pasteLocation = () => {
    const parsed = parseCoordinates(location)
    if (!parsed) { setLocationError(true); return }
    addPoint(parsed.latitude, parsed.longitude); setLocation('')
  }
  const nameKey = editLanguage === 'tr' ? 'nameTr' : 'nameEn'
  const noteKey = editLanguage === 'tr' ? 'noteTr' : 'noteEn'
  return <section className="tour-page-editor-section" data-editor-section={slot.id}>
    <header><strong><MapPin size={16} /> {slot[language]}</strong></header>
    <div className="tour-page-editor-grid">
      {points.length > 0 && <label className="tour-page-editor-checkbox field-wide"><input type="checkbox" checked={section!.isVisible} onChange={event => { const value = event.target.checked; update(item => ({ ...item, isVisible: value })) }} />{c.mapVisible}</label>}
      <label className="field-wide">{c.mapDescription}<textarea rows={3} maxLength={6000} value={section?.[editLanguage].body ?? ''} onChange={event => { const value = event.target.value; update(item => ({ ...item, [editLanguage]: { ...item[editLanguage], body: value || null } })) }} /></label>
    </div>
    <p className="tour-page-editor-hint">{c.mapHelp}{slot.id === 'route' && <> {c.routeHelp}</>}</p>
    <div className="tour-page-editor-map-layout">
      <div>
        {points.length > 0 && <ol className="tour-page-editor-points" aria-label={c.points}>{points.map((point, index) => <li key={index}>
          <span className={`tour-map-pin${index === 0 ? ' is-first' : ''}`}>{index + 1}</span>
          <div className="tour-page-editor-point-fields">
            <label>{c.pointName}<input maxLength={120} value={(editLanguage === 'tr' ? point.nameTr : point.nameEn) ?? ''} placeholder={editLanguage === 'en' ? point.nameTr : undefined}
              onChange={event => editPoint(index, { [nameKey]: event.target.value || (editLanguage === 'en' ? null : '') })} /></label>
            <label>{c.pointNote}<input maxLength={200} value={point[noteKey] ?? ''} onChange={event => editPoint(index, { [noteKey]: event.target.value || null })} /></label>
            <PointLocation key={formatCoordinates(point)} point={point} label={c.pointLocation} invalid={c.invalidLocation} onChange={value => editPoint(index, value)} />
          </div>
          <div className="tour-page-editor-point-actions">
            <button type="button" aria-label={c.up} disabled={index === 0} onClick={() => movePoint(index, -1)}><ArrowUp size={15} /></button>
            <button type="button" aria-label={c.down} disabled={index === points.length - 1} onClick={() => movePoint(index, 1)}><ArrowDown size={15} /></button>
            <button type="button" aria-label={c.removePoint} onClick={() => setPoints(current => current.filter((_, i) => i !== index))}><Trash2 size={15} /></button>
          </div>
        </li>)}</ol>}
        {points.length < 20 && <div className="tour-page-editor-point-add">
          <label>{c.addPointLabel}<input value={location} placeholder="41.0335, 29.0066" aria-invalid={locationError}
            onChange={event => { setLocation(event.target.value); setLocationError(false) }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); pasteLocation() } }} /></label>
          <button type="button" onClick={pasteLocation}><Plus size={16} />{c.addPoint}</button>
          {locationError && <small className="tour-page-editor-hint--error">{c.invalidLocation}</small>}
        </div>}
      </div>
      <Suspense fallback={<div className="tour-map" />}>
        <TourMap points={points} route={slot.id === 'route'} language={editLanguage} onMapClick={points.length < 20 ? addPoint : undefined} className="tour-map--editor" />
      </Suspense>
    </div>
    {section && <button type="button" className="tour-page-editor-note-add tour-page-editor-map-remove" onClick={remove}><Trash2 size={16} />{c.removeMap}</button>}
  </section>
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
        setPages(result); setSelectedKey(result[0]?.key ?? ''); setDocument(result[0] ? withTextDetails(structuredClone(result[0].document)) : null); setError('')
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
    setSelectedKey(key); setDocument(item ? withTextDetails(structuredClone(item.document)) : null); setDirty(false); setError(''); setSuccess('')
  }
  const updateSection = (id: string, update: (current: TourPageSection) => TourPageSection) => change(current => ({
    ...current, sections: current.sections.map(section => section.id === id ? update(section) : section),
  }))
  const addGallery = () => change(current => ({ ...current, sections: [...current.sections, {
    id: crypto.randomUUID(), type: 'gallery', background: 'white', isVisible: true, imageUrls: [],
    tr: { title: 'Galeri', body: null, items: [] }, en: { title: 'Gallery', body: null, items: [] },
  }] }))
  // Map slots exist in the draft as soon as something is typed into them; empty ones are dropped on save.
  const updateMap = (slotId: (typeof mapSlots)[number]['id'], update: (current: TourPageSection) => TourPageSection) => change(current => {
    const slot = mapSlots.find(item => item.id === slotId)!
    const existing = current.sections.find(section => section.type === 'map' && section.id === slotId)
    const section = existing ?? { id: slotId, type: 'map' as const, background: 'white' as const, isVisible: true, imageUrls: [], mapUrl: '',
      tr: { title: slot.tr, body: null, items: [] }, en: { title: slot.en, body: null, items: [] } }
    return { ...current, sections: existing ? current.sections.map(item => item === existing ? update(item) : item) : [...current.sections, update(section)] }
  })
  const setContent = (value: string) => change(current => ({ ...current, [editLanguage]: { ...current[editLanguage], details: value } }))
  const notes = document ? bookingNotesFor(document[editLanguage], editLanguage) : []
  const changeNotes = (update: (current: TourPageBookingNote[]) => TourPageBookingNote[]) =>
    change(current => ({ ...current, [editLanguage]: { ...current[editLanguage], bookingNotes: update(bookingNotesFor(current[editLanguage], editLanguage)) } }))
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
      const body = { ...document, sections: document.sections.filter(section => section.type !== 'map' || section.mapPoints?.length || section.mapUrl?.trim()) }
      const updated = await apiRequest<TourPageItem>(`/api/v1/admin/tour-pages/${selected.key}`, { method: 'PUT', token: session!.accessToken, body })
      setPages(current => current.map(page => page.key === updated.key ? updated : page))
      setDocument(withTextDetails(structuredClone(updated.document))); setDirty(false); setSuccess(c.saved)
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : c.error) }
    finally { setSaving(false) }
  }
  const pageLabel = (page: TourPageItem) => page.externalTourId ? `${page.sourceName} · #${page.externalTourId}` : categoryLabels[page.categoryKey][language]
  const content = document?.[editLanguage].details ?? ''
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
      {mode === 'preview' ? <div className="tour-page-editor-preview"><p>{c.previewHint} · {editLanguage.toUpperCase()}</p><TourPageContent page={{ ...selected, document }} language={editLanguage} onBook={() => undefined} bookingDisabled preview /></div> : <fieldset className="tour-page-editor-fields" disabled={busy}>
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
        {selected.externalTourId && <section className="tour-page-editor-section" data-editor-section="booking-notes"><header><strong>{c.notes}</strong></header>
          <p className="tour-page-editor-hint">{c.notesHint}</p>
          {notes.map((note, index) => <div className="tour-page-editor-note" key={index}>
            <label>{c.noteTitle}<input maxLength={80} required value={note.title} onChange={event => { const value = event.target.value; changeNotes(items => items.map((item, i) => i === index ? { ...item, title: value } : item)) }} /></label>
            <label>{c.noteText}<input maxLength={300} value={note.text ?? ''} onChange={event => { const value = event.target.value; changeNotes(items => items.map((item, i) => i === index ? { ...item, text: value || null } : item)) }} /></label>
            <button type="button" aria-label={c.removeNote} onClick={() => changeNotes(items => items.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
          </div>)}
          {notes.length < 4 && <button type="button" className="tour-page-editor-note-add" onClick={() => changeNotes(items => [...items, { title: '', text: null }])}><Plus size={16} />{c.addNote}</button>}
        </section>}
        <section className="tour-page-editor-section" data-editor-section="details"><header><strong>{c.content}</strong></header>
          <div className="tour-page-editor-details">
            <label>{c.contentLabel}<textarea rows={24} maxLength={50000} spellCheck value={content} placeholder={tourDetailsTemplate[editLanguage]} onChange={event => setContent(event.target.value)} /></label>
            <aside><strong>{c.guideTitle}</strong><dl>{c.guide.map(([syntax, meaning]) => <div key={syntax}><dt><code>{syntax}</code></dt><dd>{meaning}</dd></div>)}</dl>
              <p>{c.guideNote}</p><p>{c.htmlNote}</p><p>{c.previewNote}</p>
              {!content.trim() && <button type="button" onClick={() => setContent(tourDetailsTemplate[editLanguage])}><Plus size={16} />{c.template}</button>}
            </aside>
          </div>
        </section>
        <div className="tour-page-editor-section-heading"><h2>{c.galleries}</h2><p>{c.galleryHint}</p></div>
        {document.sections.filter(section => section.type === 'gallery').map((section, index) => <section className="tour-page-editor-section" key={section.id} data-editor-section={section.id}>
          <header><strong>{c.gallery} {index + 1}</strong><div>
            <button type="button" aria-label={c.remove} onClick={() => { if (window.confirm(c.removeConfirm)) change(current => ({ ...current, sections: current.sections.filter(item => item.id !== section.id) })) }}><Trash2 size={16} /></button>
          </div></header>
          <label className="tour-page-editor-checkbox"><input type="checkbox" checked={section.isVisible} onChange={event => updateSection(section.id, item => ({ ...item, isVisible: event.target.checked }))} />{c.visible}</label>
          <div className="tour-page-editor-gallery"><p>{c.galleryLimit}</p><div>{section.imageUrls.map((url, imageIndex) => <figure key={`${url}-${imageIndex}`}><img src={resolvePageImage(url)} alt="" />
            {imageIndex > 0 && <button type="button" className="tour-page-editor-gallery__first" aria-label={c.first} title={c.first} onClick={() => updateSection(section.id, item => ({ ...item, imageUrls: [url, ...item.imageUrls.filter((_, i) => i !== imageIndex)] }))}><ArrowUpLeft size={16} /></button>}
            <button type="button" aria-label={c.removeImage} onClick={() => updateSection(section.id, item => ({ ...item, imageUrls: item.imageUrls.filter((_, i) => i !== imageIndex) }))}><Trash2 size={16} /></button></figure>)}</div>
            {section.imageUrls.length < 6 && <label className="tour-page-upload"><ImagePlus size={16} />{c.addImage}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void upload(event, section.id)} /></label>}
          </div>
        </section>)}
        {document.sections.filter(section => section.type === 'gallery').length < 5 && <div className="tour-page-editor-add"><button type="button" onClick={addGallery}><Plus size={16} />{c.addGallery}</button></div>}
        <div className="tour-page-editor-section-heading"><h2>{c.maps}</h2><p>{c.mapsHint}</p></div>
        {mapSlots.map(slot => <MapSlotEditor key={slot.id} slot={slot} language={language} editLanguage={editLanguage}
          section={document.sections.find(item => item.type === 'map' && item.id === slot.id)} update={update => updateMap(slot.id, update)}
          remove={() => { if (window.confirm(c.removeMapConfirm)) change(current => ({ ...current, sections: current.sections.filter(item => !(item.type === 'map' && item.id === slot.id)) })) }} />)}
      </fieldset>}
    </>}
  </>
}
