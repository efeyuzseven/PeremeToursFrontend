import { Eye, EyeOff, HelpCircle, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiRequest, ApiError } from '../lib/api'
import { setPageMetadata } from '../lib/site'
import type { AdminLanguage } from './AdminLayout'

type ManagedQuestion = {
  id: number
  questionTr: string
  answerTr: string
  questionEn: string
  answerEn: string
  sortOrder: number
  isPublished: boolean
  createdAtUtc: string
  updatedAtUtc: string
}

type QuestionDraft = Omit<ManagedQuestion, 'id' | 'createdAtUtc' | 'updatedAtUtc'>

const emptyDraft: QuestionDraft = {
  questionTr: '', answerTr: '', questionEn: '', answerEn: '', sortOrder: 10, isPublished: true,
}

const copy = {
  tr: {
    eyebrow: 'DESTEK İÇERİKLERİ', title: 'Sıkça Sorulan Sorular', subtitle: 'Ziyaretçilerin gördüğü soruları iki dilde yönetin, sıralayın ve yayın durumlarını belirleyin.',
    add: 'Yeni soru ekle', total: 'Toplam soru', published: 'Yayında', drafts: 'Taslak', search: 'Soru veya cevap ara...', empty: 'Henüz bir soru bulunmuyor.',
    edit: 'Düzenle', delete: 'Sil', publish: 'Yayında', draft: 'Taslak', order: 'Sıra', addTitle: 'Yeni soru ekle', editTitle: 'Soruyu düzenle',
    modalText: 'Türkçe ve İngilizce metinleri birlikte girin. Sadece yayındaki sorular sitede görünür.', questionTr: 'Türkçe soru', answerTr: 'Türkçe cevap',
    questionEn: 'İngilizce soru', answerEn: 'İngilizce cevap', visible: 'Sitede yayınla', cancel: 'Vazgeç', save: 'Kaydet', saving: 'Kaydediliyor...',
    deleteConfirm: 'Bu soru kalıcı olarak silinsin mi?', error: 'Sorular yüklenemedi veya işlem tamamlanamadı.',
  },
  en: {
    eyebrow: 'SUPPORT CONTENT', title: 'Frequently Asked Questions', subtitle: 'Manage, order and publish the questions visitors see in both languages.',
    add: 'Add question', total: 'Total questions', published: 'Published', drafts: 'Drafts', search: 'Search question or answer...', empty: 'There are no questions yet.',
    edit: 'Edit', delete: 'Delete', publish: 'Published', draft: 'Draft', order: 'Order', addTitle: 'Add a new question', editTitle: 'Edit question',
    modalText: 'Enter Turkish and English copy together. Only published questions appear on the website.', questionTr: 'Turkish question', answerTr: 'Turkish answer',
    questionEn: 'English question', answerEn: 'English answer', visible: 'Publish on website', cancel: 'Cancel', save: 'Save', saving: 'Saving...',
    deleteConfirm: 'Permanently delete this question?', error: 'Questions could not be loaded or the operation failed.',
  },
}

const sortQuestions = (items: ManagedQuestion[]) => [...items].sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id)

export default function FrequentlyAskedQuestionsPage() {
  const { language } = useOutletContext<{ language: AdminLanguage }>()
  const { session } = useAuth()
  const [questions, setQuestions] = useState<ManagedQuestion[]>([])
  const [selected, setSelected] = useState<ManagedQuestion | null | 'new'>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const c = copy[language]

  useEffect(() => { setPageMetadata({ title: c.title, language, indexable: false }) }, [c.title, language])

  useEffect(() => {
    let active = true
    apiRequest<ManagedQuestion[]>('/api/v1/admin/faqs', { token: session!.accessToken })
      .then((result) => { if (active) setQuestions(sortQuestions(result)) })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.message : c.error) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [c.error, session])

  const visibleQuestions = useMemo(() => {
    const locale = language === 'tr' ? 'tr-TR' : 'en-US'
    const value = query.trim().toLocaleLowerCase(locale)
    return questions.filter((question) => !value || `${question.questionTr} ${question.answerTr} ${question.questionEn} ${question.answerEn}`.toLocaleLowerCase(locale).includes(value))
  }, [language, query, questions])

  const current: QuestionDraft = selected === 'new' || selected === null ? emptyDraft : selected

  const saveQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const data = new FormData(event.currentTarget)
    const body: QuestionDraft = {
      questionTr: String(data.get('questionTr') ?? ''), answerTr: String(data.get('answerTr') ?? ''),
      questionEn: String(data.get('questionEn') ?? ''), answerEn: String(data.get('answerEn') ?? ''),
      sortOrder: Number(data.get('sortOrder')), isPublished: data.get('isPublished') === 'on',
    }
    try {
      const isNew = selected === 'new'
      const result = await apiRequest<ManagedQuestion>(isNew ? '/api/v1/admin/faqs' : `/api/v1/admin/faqs/${selected!.id}`, {
        method: isNew ? 'POST' : 'PUT', token: session!.accessToken, body,
      })
      setQuestions((items) => sortQuestions(isNew ? [...items, result] : items.map((item) => item.id === result.id ? result : item)))
      setSelected(null)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : c.error)
    } finally {
      setSaving(false)
    }
  }

  const togglePublished = async (question: ManagedQuestion) => {
    setError('')
    try {
      const result = await apiRequest<ManagedQuestion>(`/api/v1/admin/faqs/${question.id}`, {
        method: 'PUT', token: session!.accessToken, body: { ...question, isPublished: !question.isPublished },
      })
      setQuestions((items) => sortQuestions(items.map((item) => item.id === result.id ? result : item)))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : c.error)
    }
  }

  const deleteQuestion = async (question: ManagedQuestion) => {
    if (!window.confirm(c.deleteConfirm)) return
    setError('')
    try {
      await apiRequest<void>(`/api/v1/admin/faqs/${question.id}`, { method: 'DELETE', token: session!.accessToken })
      setQuestions((items) => items.filter((item) => item.id !== question.id))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : c.error)
    }
  }

  return <>
    <div className="admin-page-heading"><div><span>{c.eyebrow}</span><h1>{c.title}</h1><p>{c.subtitle}</p></div><button className="admin-primary-button" type="button" onClick={() => { setError(''); setSelected('new') }}><Plus /> {c.add}</button></div>
    <div className="admin-stat-grid admin-stat-grid--three">
      <article><span className="stat-icon stat-icon--blue"><HelpCircle /></span><div><small>{c.total}</small><strong>{questions.length}</strong></div></article>
      <article><span className="stat-icon stat-icon--green"><Eye /></span><div><small>{c.published}</small><strong>{questions.filter((question) => question.isPublished).length}</strong></div></article>
      <article><span className="stat-icon stat-icon--violet"><EyeOff /></span><div><small>{c.drafts}</small><strong>{questions.filter((question) => !question.isPublished).length}</strong></div></article>
    </div>
    {error && <div className="admin-alert">{error}</div>}
    <section className="admin-table-card faq-admin-panel">
      <div className="admin-table-tools"><label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.search} /></label></div>
      <div className="faq-admin-list">
        {loading && Array.from({ length: 5 }).map((_, index) => <div className="faq-admin-skeleton" key={index} />)}
        {!loading && visibleQuestions.map((question) => <article key={question.id}><span className="faq-admin-order">{String(question.sortOrder).padStart(2, '0')}</span><div><h2>{language === 'tr' ? question.questionTr : question.questionEn}</h2><p>{language === 'tr' ? question.answerTr : question.answerEn}</p></div><div className="faq-admin-actions"><button className={`faq-status ${question.isPublished ? 'active' : ''}`} type="button" onClick={() => void togglePublished(question)}>{question.isPublished ? <Eye /> : <EyeOff />}{question.isPublished ? c.publish : c.draft}</button><button type="button" title={c.edit} onClick={() => { setError(''); setSelected(question) }}><Pencil /></button><button className="danger" type="button" title={c.delete} onClick={() => void deleteQuestion(question)}><Trash2 /></button></div></article>)}
        {!loading && visibleQuestions.length === 0 && <div className="admin-empty"><HelpCircle /><p>{c.empty}</p></div>}
      </div>
    </section>

    {selected && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setSelected(null) }}>
      <section className="admin-modal faq-editor" role="dialog" aria-modal="true" aria-labelledby="faq-editor-title">
        <button className="admin-modal__close" type="button" disabled={saving} onClick={() => setSelected(null)}><X /></button>
        <div className="admin-modal__heading"><span><HelpCircle /></span><div><h2 id="faq-editor-title">{selected === 'new' ? c.addTitle : c.editTitle}</h2><p>{c.modalText}</p></div></div>
        {error && <div className="admin-alert faq-editor__error">{error}</div>}
        <form key={selected === 'new' ? 'new' : selected.id} onSubmit={saveQuestion}>
          <label>{c.questionTr}<input name="questionTr" required minLength={2} maxLength={300} defaultValue={current.questionTr} /></label>
          <label>{c.questionEn}<input name="questionEn" required minLength={2} maxLength={300} defaultValue={current.questionEn} /></label>
          <label className="field-wide">{c.answerTr}<textarea name="answerTr" required minLength={2} maxLength={3000} rows={5} defaultValue={current.answerTr} /></label>
          <label className="field-wide">{c.answerEn}<textarea name="answerEn" required minLength={2} maxLength={3000} rows={5} defaultValue={current.answerEn} /></label>
          <div className="faq-editor__settings field-wide"><label>{c.order}<input name="sortOrder" type="number" min={0} max={9999} required defaultValue={current.sortOrder} /></label><label><input name="isPublished" type="checkbox" defaultChecked={current.isPublished} /><span>{c.visible}</span></label></div>
          <div className="admin-modal__actions field-wide"><button type="button" disabled={saving} onClick={() => setSelected(null)}>{c.cancel}</button><button className="admin-primary-button" disabled={saving} type="submit"><Save /> {saving ? c.saving : c.save}</button></div>
        </form>
      </section>
    </div>}
  </>
}
