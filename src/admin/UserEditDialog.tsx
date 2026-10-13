import { Pencil, Save, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { ApiError, apiRequest } from '../lib/api'
import type { UserRole } from '../auth/AuthContext'
import type { AdminLanguage } from './AdminLayout'
import './users.css'

export type ManagedUser = {
  id: string; email: string; firstName: string; lastName?: string | null
  role: UserRole; isActive: boolean; createdAtUtc: string; canEditEmail?: boolean
}
export type ProfileUpdate = { firstName: string; lastName: string; email?: string }

const copy = {
  tr: {
    title: 'Kullanıcı bilgilerini düzenle', intro: 'Hesap bilgilerini güncelle. Mevcut rezervasyonlar değişmez.',
    firstName: 'Ad', lastName: 'Soyad', email: 'E-posta adresi', cancel: 'Vazgeç', close: 'Kapat', save: 'Değişiklikleri kaydet', saving: 'Kaydediliyor…',
    invalid: 'Geçerli bir ad ve e-posta adresi girin.', failed: 'Bilgiler kaydedilemedi. Lütfen tekrar deneyin.',
    duplicate: 'Bu e-posta adresi başka bir hesap tarafından kullanılıyor.', conflict: 'Hesap başka bir işlemde değiştirildi. Pencereyi kapatıp listeyi yenileyin.',
    protected: 'Varsayılan yönetici hesabının giriş e-postası dağıtım ayarlarına bağlıdır; bu ekrandan değiştirilemez.',
    expired: 'Oturumunuz veya yönetici yetkiniz geçerli değil. Yeniden giriş yapın.', missing: 'Bu kullanıcı artık mevcut değil. Listeyi yenileyin.',
    emailHint: 'E-posta değişirse kullanıcı yeni adresiyle giriş yapar; mevcut oturumları ve eski şifre sıfırlama bağlantıları geçersiz olur. Şifresi değişmez.',
    selfHint: 'Kendi giriş e-postanızı değiştirirseniz oturumunuz kapatılır. Yeni adresiniz ve mevcut şifrenizle yeniden giriş yapmanız gerekir.',
  },
  en: {
    title: 'Edit user details', intro: 'Update account details. Existing bookings will not change.',
    firstName: 'First name', lastName: 'Last name', email: 'Email address', cancel: 'Cancel', close: 'Close', save: 'Save changes', saving: 'Saving…',
    invalid: 'Enter a valid first name and email address.', failed: 'Could not save the details. Please try again.',
    duplicate: 'This email address is already used by another account.', conflict: 'Another request changed this account. Close this window and refresh the list.',
    protected: 'The default administrator login email is managed by deployment settings and cannot be changed here.',
    expired: 'Your session or administrator access is no longer valid. Please sign in again.', missing: 'This user no longer exists. Refresh the list.',
    emailHint: 'Changing the email invalidates existing sessions and password reset links. The user signs in with the new address and the same password.',
    selfHint: 'Changing your own login email signs you out. Sign in again with the new address and your existing password.',
  },
}

export default function UserEditDialog({ user, token, language, isSelf, returnFocus, onClose, onSaved }: {
  user: ManagedUser; token: string; language: AdminLanguage; isSelf: boolean
  returnFocus: RefObject<HTMLButtonElement | null>
  onClose: () => void; onSaved: (profile: ProfileUpdate) => Promise<void>
}) {
  const c = copy[language]
  const [firstName, setFirstName] = useState(user.firstName)
  const [lastName, setLastName] = useState(user.lastName ?? '')
  const [email, setEmail] = useState(user.email)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const saving = useRef(false)
  const dialog = useRef<HTMLElement>(null)
  const protectedEmail = user.canEditEmail === false
  const dirty = firstName.trim() !== user.firstName || lastName.trim() !== (user.lastName ?? '')
    || (!protectedEmail && email.trim().toLowerCase() !== user.email.toLowerCase())

  useEffect(() => {
    const previous = returnFocus.current ?? document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.querySelector<HTMLInputElement>('input')?.focus()
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving.current) onClose()
      if (event.key !== 'Tab') return
      const nodes = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)')
      if (!nodes?.length) { event.preventDefault(); dialog.current?.focus(); return }
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialog.current?.contains(document.activeElement))) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.current?.contains(document.activeElement))) {
        event.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', keyboard)
    return () => {
      document.removeEventListener('keydown', keyboard)
      document.body.style.overflow = overflow
      requestAnimationFrame(() => { if (previous?.isConnected) previous.focus() })
    }
  }, [onClose, returnFocus])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving.current || !dirty) return
    const profile: ProfileUpdate = { firstName: firstName.trim(), lastName: lastName.trim(),
      ...(!protectedEmail ? { email: email.trim().toLowerCase() } : {}) }
    if (!profile.firstName || profile.firstName.length > 100 || profile.lastName.length > 100
      || (!protectedEmail && (!profile.email || !/^[^\s@]+@[^\s@]+$/.test(profile.email) || profile.email.length > 320))) {
      setError(c.invalid); return
    }
    saving.current = true
    setBusy(true)
    setError('')
    try {
      await apiRequest<void>(`/api/v1/admin/users/${user.id}`, { method: 'PATCH', token, body: profile })
    } catch (caught) {
      setError(caught instanceof ApiError
        ? caught.code === 'USER_EMAIL_ALREADY_EXISTS' ? c.duplicate
          : caught.code === 'USER_EMAIL_PROTECTED' ? c.protected
            : caught.code === 'USER_UPDATE_CONFLICT' ? c.conflict
              : caught.status === 401 || caught.status === 403 ? c.expired
                : caught.status === 404 ? c.missing : caught.status === 400 ? c.invalid : c.failed
        : c.failed)
      saving.current = false
      setBusy(false)
      return
    }
    // PATCH succeeded. Refresh failures must never imply that this save should be repeated.
    await onSaved(profile)
  }

  return createPortal(<div className="admin-modal-backdrop" onMouseDown={(event) => {
    if (event.target === event.currentTarget && !saving.current) onClose()
  }}>
    <section ref={dialog} tabIndex={-1} className="admin-modal user-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="user-edit-title" aria-describedby="user-edit-intro">
      <button type="button" className="admin-modal__close" disabled={busy} onClick={onClose} aria-label={c.close}><X /></button>
      <div className="admin-modal__heading"><span><Pencil size={20} /></span><div><h2 id="user-edit-title">{c.title}</h2><p id="user-edit-intro">{c.intro}</p></div></div>
      <form onSubmit={(event) => void submit(event)} noValidate aria-busy={busy}>
        <label>{c.firstName}<input name="firstName" value={firstName} onChange={(event) => setFirstName(event.target.value)} required maxLength={100} disabled={busy} autoComplete="off" /></label>
        <label>{c.lastName}<input name="lastName" value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={100} disabled={busy} autoComplete="off" /></label>
        <label className="field-wide">{c.email}<input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={320} disabled={busy} readOnly={protectedEmail} autoComplete="off" aria-describedby="user-email-hint" /></label>
        <p className="user-edit-note field-wide" id="user-email-hint">{protectedEmail ? c.protected : c.emailHint}{isSelf && !protectedEmail && <span>{c.selfHint}</span>}</p>
        {error && <p className="user-edit-error field-wide" role="alert">{error}</p>}
        <div className="admin-modal__actions field-wide"><button type="button" onClick={onClose} disabled={busy}>{c.cancel}</button><button type="submit" className="admin-primary-button" disabled={busy || !dirty}><Save size={16} />{busy ? c.saving : c.save}</button></div>
      </form>
    </section>
  </div>, document.body)
}
