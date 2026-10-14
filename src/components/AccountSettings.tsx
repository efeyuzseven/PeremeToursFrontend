import { Check, LockKeyhole, Save, Trash2 } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError, apiRequest } from '../lib/api'

export type AccountProfile = {
  firstName: string; lastName: string | null; email: string; createdAtUtc: string
  canEditEmail?: boolean; canDeleteAccount?: boolean; deletionBlockedReason?: string | null
}
type Action = 'profile' | 'password' | 'delete'

export default function AccountSettings({ profile, language, onSaved }: {
  profile: AccountProfile; language: 'tr' | 'en'; onSaved: (profile: AccountProfile) => void
}) {
  const { session, logout, updateOwnProfile } = useAuth()
  const navigate = useNavigate()
  const tr = language === 'tr'
  const [firstName, setFirstName] = useState(profile.firstName)
  const [lastName, setLastName] = useState(profile.lastName ?? '')
  const [email, setEmail] = useState(profile.email)
  const [busy, setBusy] = useState<Action | null>(null)
  const guard = useRef(false)
  const [notice, setNotice] = useState<{ action: Action; success: boolean; message: string } | null>(null)
  const [deletionWord, setDeletionWord] = useState('')
  const [deletionConfirmed, setDeletionConfirmed] = useState(false)
  const emailChanged = email.trim().toLowerCase() !== profile.email.toLowerCase()
  const confirmWord = tr ? 'SİL' : 'DELETE'
  const errorMessage = (failure: unknown) => {
    if (!(failure instanceof ApiError)) return tr ? 'İşlem tamamlanamadı.' : 'The request could not be completed.'
    if (failure.status === 401) return tr ? 'Oturumun sona erdi. Yeniden giriş yap.' : 'Your session has ended. Please sign in again.'
    if (failure.status === 429) return tr ? 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.' : 'Too many attempts. Please try again later.'
    const messages: Record<string, string> = {
      CURRENT_PASSWORD_INCORRECT: tr ? 'Mevcut şifren doğru değil.' : 'Your current password is incorrect.',
      INVALID_NEW_PASSWORD: tr ? 'Yeni şifre 8–128 karakter, büyük harf, küçük harf ve rakam içermeli.' : 'Use 8–128 characters, an uppercase letter, a lowercase letter and a number.',
      ACCOUNT_EMAIL_IN_USE: tr ? 'Bu e-posta başka bir hesapta kullanılıyor.' : 'This email is already used by another account.',
      ACCOUNT_EMAIL_PROTECTED: tr ? 'Bu yönetici hesabının giriş e-postası değiştirilemez.' : 'The login email of this protected administrator account cannot be changed.',
      ACCOUNT_DELETION_PROTECTED: tr ? 'Bu yönetici hesabı sistem tarafından korunuyor; silinemez.' : 'This administrator account is protected and cannot be deleted.',
      LAST_ADMINISTRATOR: tr ? 'Son aktif yönetici hesabı silinemez. Önce başka bir yönetici tanımlanmalı.' : 'The last active administrator cannot be deleted. Add another administrator first.',
      ACCOUNT_UPDATE_CONFLICT: tr ? 'Hesap başka bir işlemde değişti. Sayfayı yenileyip tekrar kontrol et.' : 'Your account changed in another request. Refresh the page and check again.',
      INVALID_ACCOUNT_PROFILE: tr ? 'Ad ve e-posta bilgilerini kontrol et.' : 'Please check your name and email.',
    }
    return messages[failure.code ?? ''] ?? (failure.status === 0 || failure.status >= 500
      ? tr ? 'İşlem sonucu doğrulanamadı. Tekrar denemeden önce yeniden giriş yaparak hesabını kontrol et.' : 'The result could not be verified. Sign in again to check your account before retrying.'
      : tr ? 'İşlem tamamlanamadı. Bilgilerini kontrol et.' : 'The request could not be completed. Check your details.')
  }
  const submit = async (event: FormEvent<HTMLFormElement>, action: Action) => {
    event.preventDefault()
    if (guard.current || !session) return
    const form = event.currentTarget
    const data = new FormData(form)
    const currentPassword = String(data.get('currentPassword') ?? '')
    setNotice(null)
    if (action === 'password') {
      const password = String(data.get('newPassword') ?? '')
      if (password !== data.get('confirmPassword')) {
        setNotice({ action, success: false, message: tr ? 'Yeni şifreler eşleşmiyor.' : 'The new passwords do not match.' }); return
      }
      if (password.length < 8 || password.length > 128 || !/\p{Lu}/u.test(password) || !/\p{Ll}/u.test(password) || !/\p{Nd}/u.test(password)) {
        setNotice({ action, success: false, message: tr ? 'Yeni şifre 8–128 karakter, büyük harf, küçük harf ve rakam içermeli.' : 'Use 8–128 characters, an uppercase letter, a lowercase letter and a number.' }); return
      }
    }
    if (action === 'delete' && (!deletionConfirmed || deletionWord !== confirmWord || profile.canDeleteAccount === false)) return
    guard.current = true; setBusy(action)
    try {
      const result = await apiRequest<{ requiresLogin: boolean }>(action === 'profile' ? '/api/v1/account/profile' : action === 'password' ? '/api/v1/account/password' : '/api/v1/account', {
        method: action === 'profile' ? 'PATCH' : action === 'password' ? 'POST' : 'DELETE', token: session.accessToken,
        body: action === 'profile' ? { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), ...(emailChanged ? { currentPassword } : {}) }
          : action === 'password' ? { currentPassword, newPassword: String(data.get('newPassword')) } : { currentPassword, confirmed: true },
      })
      if (action !== 'profile' || result.requiresLogin) {
        logout(action === 'password' ? 'password-updated' : action === 'delete' ? 'account-deleted' : 'email-updated')
        navigate('/login', { replace: true }); return
      }
      const saved = { ...profile, firstName: firstName.trim(), lastName: lastName.trim() || null, email: email.trim().toLowerCase() }
      setFirstName(saved.firstName); setLastName(saved.lastName ?? ''); setEmail(saved.email)
      onSaved(saved); updateOwnProfile(saved.firstName, saved.lastName)
      setNotice({ action, success: true, message: tr ? 'Kişisel bilgilerin güncellendi.' : 'Your personal details were updated.' })
    } catch (failure) { setNotice({ action, success: false, message: errorMessage(failure) }) }
    finally {
      // Passwords exist only in the submitted form/request, never in browser storage or saved account data.
      form.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach((input) => { input.value = '' })
      guard.current = false; setBusy(null)
    }
  }
  const message = (action: Action) => notice?.action === action && <p className={`account-form-notice ${notice.success ? 'is-success' : ''}`} role={notice.success ? 'status' : 'alert'}>{notice.success && <Check size={16} />}{notice.message}</p>
  return <div className="account-settings">
    <form className="account-settings__form" onSubmit={(event) => void submit(event, 'profile')}>
      <fieldset disabled={!!busy}>
        <legend className="sr-only">{tr ? 'Kişisel bilgilerini düzenle' : 'Edit your personal details'}</legend>
        <div className="account-form-grid">
          <label>{tr ? 'Ad' : 'First name'}<input name="firstName" autoComplete="given-name" required maxLength={100} value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
          <label>{tr ? 'Soyad' : 'Last name'}<input name="lastName" autoComplete="family-name" maxLength={100} value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
          <label className="account-form-wide">{tr ? 'E-posta adresi' : 'Email address'}<input name="email" type="email" aria-label={tr ? 'E-posta adresi' : 'Email address'} autoComplete="email" required maxLength={320} readOnly={profile.canEditEmail === false} value={email} onChange={(event) => setEmail(event.target.value)} />
            {profile.canEditEmail === false && <small>{tr ? 'Bu yönetici hesabının giriş e-postası sistem tarafından korunur.' : 'This administrator login email is protected.'}</small>}
          </label>
          {emailChanged && <label className="account-form-wide">{tr ? 'Mevcut şifre' : 'Current password'}<input name="currentPassword" type="password" aria-label={tr ? 'Mevcut şifre' : 'Current password'} aria-describedby="account-email-password-hint" required maxLength={128} autoComplete="current-password" /><small id="account-email-password-hint">{tr ? 'E-posta değiştiğinde tüm oturumların kapanır. Yeni adresinle tekrar giriş yapmalısın.' : 'Changing your email closes all sessions. Sign in again with your new address.'}</small></label>}
        </div>
        {message('profile')}
        <button className="account-save" type="submit"><Save size={16} />{busy === 'profile' ? tr ? 'Kaydediliyor…' : 'Saving…' : tr ? 'Bilgilerimi güncelle' : 'Update my details'}</button>
      </fieldset>
    </form>
    <details className="account-settings__disclosure">
      <summary><LockKeyhole size={18} /><span>{tr ? 'Şifremi değiştir' : 'Change my password'}</span></summary>
      <form onSubmit={(event) => void submit(event, 'password')}>
        <p>{tr ? 'Şifre değiştiğinde açık oturumların kapatılır.' : 'Changing your password closes all existing sessions.'}</p>
        <fieldset disabled={!!busy}>
          <legend className="sr-only">{tr ? 'Şifre değişikliği' : 'Password change'}</legend>
          <div className="account-form-grid">
            <label className="account-form-wide">{tr ? 'Mevcut şifre' : 'Current password'}<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} /></label>
            <label>{tr ? 'Yeni şifre' : 'New password'}<input name="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></label>
            <label>{tr ? 'Yeni şifre tekrar' : 'Confirm new password'}<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></label>
          </div>
          <p className="account-form-hint">{tr ? '8–128 karakter, bir büyük harf, bir küçük harf ve bir rakam kullan.' : 'Use 8–128 characters, an uppercase letter, a lowercase letter and a number.'}</p>
          {message('password')}
          <button className="account-save" type="submit"><LockKeyhole size={16} />{busy === 'password' ? tr ? 'Güncelleniyor…' : 'Updating…' : tr ? 'Şifremi güncelle' : 'Update my password'}</button>
        </fieldset>
      </form>
    </details>
    <details className="account-settings__disclosure account-settings__delete">
      <summary><Trash2 size={18} /><span>{tr ? 'Hesabımı sil' : 'Delete my account'}</span></summary>
      {profile.canDeleteAccount === false ? <p>{profile.deletionBlockedReason === 'LAST_ADMINISTRATOR'
        ? tr ? 'Son aktif yönetici hesabı silinemez. Önce başka bir yönetici tanımlanmalı.' : 'The last active administrator cannot be deleted. Add another administrator first.'
        : tr ? 'Bu yönetici hesabı sistem tarafından korunuyor ve silinemez. Bilgilerini ve şifreni güncelleyebilirsin.' : 'This administrator account is protected and cannot be deleted. You can still update your name and password.'}</p>
        : <form onSubmit={(event) => void submit(event, 'delete')}>
          <p>{tr ? 'Hesabın ve giriş bilgilerin kalıcı olarak kaldırılır. Biletlerin iptal edilmez, iade başlatılmaz. Rezervasyon, ödeme ve işlem kayıtları korunur; silinen hesabın bu kayıtlara tekrar erişemez.' : 'Your account and login details will be permanently removed. Tickets are not cancelled and no refund is initiated. Reservation, payment and transaction records are retained; the deleted account cannot access them again.'}</p>
          <fieldset disabled={!!busy}>
            <legend className="sr-only">{tr ? 'Hesap silme onayı' : 'Confirm account deletion'}</legend>
            <div className="account-form-grid">
              <label>{tr ? 'Mevcut şifre' : 'Current password'}<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} /></label>
              <label>{tr ? 'Onaylamak için SİL yaz' : 'Type DELETE to confirm'}<input name="deleteConfirmation" autoComplete="off" required maxLength={10} value={deletionWord} onChange={(event) => setDeletionWord(event.target.value)} /></label>
            </div>
            <label className="account-delete-check"><input type="checkbox" required checked={deletionConfirmed} onChange={(event) => setDeletionConfirmed(event.target.checked)} />{tr ? 'Bu işlemin geri alınamayacağını ve bilet iptali olmadığını anladım.' : 'I understand this cannot be undone and does not cancel tickets.'}</label>
            {message('delete')}
            <button className="account-save account-save--delete" type="submit" disabled={!deletionConfirmed || deletionWord !== confirmWord}><Trash2 size={16} />{busy === 'delete' ? tr ? 'Siliniyor…' : 'Deleting…' : tr ? 'Hesabımı kalıcı olarak sil' : 'Permanently delete my account'}</button>
          </fieldset>
        </form>}
    </details>
  </div>
}
