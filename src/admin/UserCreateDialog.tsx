import { Eye, EyeOff, RefreshCw, UserPlus, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { ApiError, apiRequest } from '../lib/api'
import { roleLabel, userRoles, type UserRole } from '../auth/roles'
import type { AdminLanguage } from './AdminLayout'
import type { ManagedUser } from './UserEditDialog'
import './users.css'

const copy = {
  tr: {
    title: 'Yeni kullanıcı oluştur', intro: 'Hesap bilgilerini girin ve erişim rolünü seçin.', first: 'Ad', last: 'Soyad', email: 'E-posta adresi',
    password: 'Başlangıç şifresi', confirm: 'Şifre tekrar', role: 'Rol', show: 'Şifreleri göster', hide: 'Şifreleri gizle',
    policy: '8–128 karakter, en az bir büyük harf, bir küçük harf ve bir rakam kullanın.',
    hint: 'Şifre e-postayla gönderilmez. Kullanıcı giriş yaptıktan sonra Hesabım üzerinden şifresini değiştirebilir.',
    save: 'Kullanıcı oluştur', saving: 'Oluşturuluyor…', cancel: 'Vazgeç', close: 'Kapat', invalid: 'Geçerli bir ad ve e-posta adresi girin.',
    mismatch: 'Şifreler eşleşmiyor.', duplicate: 'Bu e-posta adresiyle kayıtlı bir hesap var. Mevcut hesap ve şifresi değiştirilmedi.',
    conflict: 'Başka bir işlemle çakışma oldu. Bilgileri kontrol edip tekrar deneyin.', failed: 'Kullanıcı oluşturulamadı. Bilgileri kontrol edin.',
    expired: 'Yönetici oturumunuz geçerli değil. Yeniden giriş yapın.', limited: 'Çok fazla deneme yapıldı. Biraz sonra tekrar deneyin.',
    unknown: 'İşlem sonucu doğrulanamadı. Hesap oluşturulmuş olabilir; tekrar göndermeden önce listeyi kontrol edin.',
    check: 'Listeyi kontrol et', checkFailed: 'Liste yenilenemedi. Hesabı tekrar oluşturmadan önce bağlantıyı ve kullanıcı listesini kontrol edin.',
  },
  en: {
    title: 'Create a new user', intro: 'Enter account details and choose an access role.', first: 'First name', last: 'Last name', email: 'Email address',
    password: 'Initial password', confirm: 'Confirm password', role: 'Role', show: 'Show passwords', hide: 'Hide passwords',
    policy: 'Use 8–128 characters, an uppercase letter, a lowercase letter and a number.',
    hint: 'The password is not emailed. After signing in, the user can change it in My account.',
    save: 'Create user', saving: 'Creating…', cancel: 'Cancel', close: 'Close', invalid: 'Enter a valid first name and email address.',
    mismatch: 'The passwords do not match.', duplicate: 'An account already uses this email. The existing account and password were not changed.',
    conflict: 'Another request conflicted with this operation. Check the details and try again.', failed: 'The user could not be created. Check the details.',
    expired: 'Your administrator session is no longer valid. Please sign in again.', limited: 'Too many attempts. Please try again later.',
    unknown: 'The result could not be verified. The account may have been created. Check the user list before submitting again.',
    check: 'Check user list', checkFailed: 'The list could not be refreshed. Check your connection and user list before creating the account again.',
  },
}
const permissions: Record<AdminLanguage, Record<UserRole, string>> = {
  tr: {
    User: 'Kendi hesabını ve rezervasyonlarını yönetir. Panel erişimi yoktur.',
    Admin: 'Kullanıcı ve rol yönetimi dahil tüm yönetim paneline tam erişim sağlar.',
    Editor: 'Site İçerikleri, Tur İçerikleri, Tur Sayfaları ve SSS içeriklerini düzenleyebilir.',
    Advisor: 'Site İçerikleri, Tur İçerikleri, Tur Sayfaları ve SSS içeriklerini düzenleyebilir.',
    Service: 'Geri bildirimleri yanıtlar; tur biletlerini ve hataları görür, bilet iptal/iadesi yapabilir.',
  },
  en: {
    User: 'Manages their own account and bookings. No panel access.',
    Admin: 'Full panel access, including user and role management.',
    Editor: 'Edits Site Content, Tour Content, Tour Pages and FAQs.',
    Advisor: 'Edits Site Content, Tour Content, Tour Pages and FAQs.',
    Service: 'Responds to feedback, views tickets and errors, and can cancel/refund bookings.',
  },
}

export default function UserCreateDialog({ token, language, returnFocus, onClose, onCreated, onCheckList }: {
  token: string; language: AdminLanguage; returnFocus: RefObject<HTMLButtonElement | null>
  onClose: () => void; onCreated: (user: ManagedUser) => void; onCheckList: (email: string) => Promise<void>
}) {
  const c = copy[language]
  const [role, setRole] = useState<UserRole>('User')
  const [showPasswords, setShowPasswords] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const saving = useRef(false)
  const submittedEmail = useRef('')
  const dialog = useRef<HTMLElement>(null)
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => {
    const previous = returnFocus.current
    const root = document.getElementById('root')
    const previousInert = root?.inert ?? false
    const overflow = document.body.style.overflow
    if (root) root.inert = true
    document.body.style.overflow = 'hidden'
    dialog.current?.querySelector<HTMLInputElement>('input')?.focus()
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); if (!saving.current) onClose(); return }
      if (event.key !== 'Tab') return
      const nodes = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)')
      if (!nodes?.length) { event.preventDefault(); dialog.current?.focus(); return }
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialog.current?.contains(document.activeElement))) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.current?.contains(document.activeElement))) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keyboard)
    return () => {
      document.removeEventListener('keydown', keyboard)
      document.body.style.overflow = overflow
      if (root) root.inert = previousInert
      requestAnimationFrame(() => { if (previous?.isConnected) previous.focus() })
    }
  }, [onClose, returnFocus])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving.current || uncertain) return
    const data = new FormData(event.currentTarget)
    const firstName = String(data.get('firstName') ?? '').trim()
    const lastName = String(data.get('lastName') ?? '').trim()
    const email = String(data.get('email') ?? '').trim().toLowerCase()
    const password = String(data.get('password') ?? '')
    if (!firstName || firstName.length > 100 || lastName.length > 100 || email.length > 320 || !/^[^\s@]+@[^\s@]+$/.test(email)) { setError(c.invalid); return }
    if (password !== data.get('confirmPassword')) { setError(c.mismatch); return }
    if (password.length < 8 || password.length > 128 || !/\p{Lu}/u.test(password) || !/\p{Ll}/u.test(password) || !/\p{Nd}/u.test(password)) { setError(c.policy); return }
    saving.current = true; submittedEmail.current = email; setBusy(true); setError('')
    try {
      const created = await apiRequest<ManagedUser>('/api/v1/admin/users', { method: 'POST', token, body: { firstName, lastName, email, password, role } })
      onCreated(created)
    } catch (caught) {
      const unknown = !(caught instanceof ApiError) || caught.status === 0 || caught.status >= 500
      setUncertain(unknown)
      setError(unknown ? c.unknown : caught.code === 'USER_EMAIL_ALREADY_EXISTS' ? c.duplicate
        : caught.code === 'USER_CREATE_CONFLICT' ? c.conflict : caught.code === 'PASSWORD_POLICY_INVALID' ? c.policy
          : caught.status === 401 || caught.status === 403 ? c.expired : caught.status === 429 ? c.limited : c.failed)
    } finally {
      for (const name of ['password', 'confirmPassword']) {
        const input = form.current?.elements.namedItem(name)
        if (input instanceof HTMLInputElement) input.value = ''
      }
      saving.current = false; setBusy(false); setShowPasswords(false)
    }
  }
  const checkList = async () => {
    if (saving.current) return
    saving.current = true; setBusy(true)
    try { await onCheckList(submittedEmail.current) }
    catch { setError(c.checkFailed) }
    finally { saving.current = false; setBusy(false) }
  }
  return createPortal(<div className="admin-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !saving.current) onClose() }}>
    <section ref={dialog} className="admin-modal user-edit-dialog user-create-dialog" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="user-create-title" aria-describedby="user-create-intro">
      <button className="admin-modal__close" type="button" aria-label={c.close} disabled={busy} onClick={onClose}><X /></button>
      <div className="admin-modal__heading"><span><UserPlus size={20} /></span><div><h2 id="user-create-title">{c.title}</h2><p id="user-create-intro">{c.intro}</p></div></div>
      <form ref={form} onSubmit={event => void submit(event)} noValidate aria-busy={busy}>
        <label>{c.first}<input name="firstName" required maxLength={100} disabled={busy || uncertain} autoComplete="off" /></label>
        <label>{c.last}<input name="lastName" maxLength={100} disabled={busy || uncertain} autoComplete="off" /></label>
        <label className="field-wide">{c.email}<input name="email" type="email" required maxLength={320} disabled={busy || uncertain} autoComplete="off" /></label>
        <label className="field-wide">{c.role}<select name="role" aria-label={c.role} value={role} onChange={event => setRole(event.target.value as UserRole)} disabled={busy || uncertain} aria-describedby="user-create-role-hint">{userRoles.map(item => <option key={item} value={item}>{roleLabel(item, language)}</option>)}</select></label>
        <p className="user-edit-note field-wide" id="user-create-role-hint">{permissions[language][role]}</p>
        <label>{c.password}<input name="password" type={showPasswords ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={128} disabled={busy || uncertain} aria-describedby="user-create-password-hint" /></label>
        <label>{c.confirm}<input name="confirmPassword" type={showPasswords ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={128} disabled={busy || uncertain} /></label>
        <button className="user-password-toggle field-wide" type="button" disabled={busy || uncertain} aria-pressed={showPasswords} onClick={() => setShowPasswords(value => !value)}>{showPasswords ? <EyeOff size={17} /> : <Eye size={17} />}{showPasswords ? c.hide : c.show}</button>
        <p className="user-create-password-hint field-wide" id="user-create-password-hint">{c.policy} {c.hint}</p>
        {error && <p className="user-edit-error field-wide" role="alert">{error}</p>}
        <div className="admin-modal__actions field-wide"><button type="button" disabled={busy} onClick={onClose}>{c.cancel}</button>{uncertain
          ? <button type="button" className="admin-primary-button" disabled={busy} onClick={() => void checkList()}><RefreshCw size={16} />{c.check}</button>
          : <button type="submit" className="admin-primary-button" disabled={busy}><UserPlus size={16} />{busy ? c.saving : c.save}</button>}</div>
      </form>
    </section>
  </div>, document.body)
}
