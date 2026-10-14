import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Globe2, LockKeyhole, Mail, Sparkles, UserRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError, apiRequest } from '../lib/api'
import { setPageMetadata } from '../lib/site'
import './login.css'

type Language = 'tr' | 'en'
type Mode = 'login' | 'register' | 'forgot' | 'reset'

const text = {
  tr: {
    back: 'Siteye dön', eyebrow: 'Pereme hesabım', title: 'Boğaz deneyimin burada başlar.',
    subtitle: 'Rezervasyonlarını tek yerden takip et, yaklaşan turlarına kolayca ulaş.',
    login: 'Giriş yap', register: 'Hesap oluştur', email: 'E-posta adresi', password: 'Şifre',
    firstName: 'Ad', lastName: 'Soyad', loginButton: 'Hesabıma giriş yap', registerButton: 'Ücretsiz hesap oluştur',
    secure: 'Bilgilerin güvenli biçimde korunur.',
    featureOne: 'Biletlerine anında ulaş', featureTwo: 'Tur durumunu kolayca takip et', featureThree: 'Tercihlerini tek yerde yönet',
    forgot: 'Şifremi unuttum', forgotIntro: 'Hesabına bağlı e-posta adresini gir, sıfırlama bağlantısı gönderelim.',
    send: 'Sıfırlama bağlantısı gönder', reset: 'Yeni şifre belirle', resetIntro: 'Hesabın için yeni bir şifre oluştur.',
    newPassword: 'Yeni şifre', confirm: 'Yeni şifre tekrar', resetButton: 'Şifremi güncelle',
    passwordHint: 'En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam kullan.',
    sent: 'Bu adresle aktif bir hesap varsa şifre sıfırlama bağlantısı gönderilecek.',
    sentHint: 'Gelen kutunu ve spam klasörünü kontrol et. Bağlantı 30 dakika geçerlidir.',
    resetDone: 'Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.',
    invalid: 'Bu bağlantı geçersiz, kullanılmış veya süresi dolmuş. Yeni bir sıfırlama bağlantısı isteyebilirsin.',
    mismatch: 'Şifreler eşleşmiyor.', policy: 'Şifren en az 8 karakter, büyük harf, küçük harf ve rakam içermeli.',
    tooMany: 'Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar dene.',
    failed: 'İşlem tamamlanamadı. Lütfen tekrar dene.', show: 'Şifreyi göster', hide: 'Şifreyi gizle',
    backLogin: 'Giriş ekranına dön', requestAgain: 'Yeni bağlantı iste',
    emailUpdated: 'Giriş e-postanız güncellendi. Yeni adresiniz ve mevcut şifrenizle yeniden giriş yapın.',
    passwordUpdated: 'Şifren güncellendi ve önceki oturumların kapatıldı. Yeni şifrenle giriş yapabilirsin.',
    accountDeleted: 'Hesabın silindi. Bu işlem mevcut biletlerini iptal etmez ve otomatik iade başlatmaz.',
  },
  en: {
    back: 'Back to website', eyebrow: 'My Pereme account', title: 'Your Bosphorus story starts here.',
    subtitle: 'Keep your bookings together and reach every upcoming experience with ease.',
    login: 'Sign in', register: 'Create account', email: 'Email address', password: 'Password',
    firstName: 'First name', lastName: 'Last name', loginButton: 'Sign in to my account', registerButton: 'Create free account',
    secure: 'Your information is protected securely.',
    featureOne: 'Reach your tickets instantly', featureTwo: 'Follow each tour with ease', featureThree: 'Manage preferences in one place',
    forgot: 'Forgot password?', forgotIntro: 'Enter your account email to request a password reset link.',
    send: 'Send reset link', reset: 'Set a new password', resetIntro: 'Choose a new password for your account.',
    newPassword: 'New password', confirm: 'Confirm new password', resetButton: 'Update my password',
    passwordHint: 'Use at least 8 characters, an uppercase letter, a lowercase letter and a number.',
    sent: 'If an active account uses this address, a password reset link will be sent.',
    sentHint: 'Check your inbox and spam folder. The link is valid for 30 minutes.',
    resetDone: 'Your password has been updated. You can now sign in with your new password.',
    invalid: 'This link is invalid, already used or expired. Please request a new password reset link.',
    mismatch: 'The passwords do not match.', policy: 'Use at least 8 characters, an uppercase letter, a lowercase letter and a number.',
    tooMany: 'Too many attempts. Please try again later.',
    failed: 'We could not complete this request. Please try again.', show: 'Show password', hide: 'Hide password',
    backLogin: 'Back to sign in', requestAgain: 'Request a new link',
    emailUpdated: 'Your login email has been updated. Sign in again with the new address and your existing password.',
    passwordUpdated: 'Your password was updated and previous sessions were closed. Sign in with your new password.',
    accountDeleted: 'Your account was deleted. This does not cancel existing tickets or initiate a refund.',
  },
}

export default function LoginPage({ initialMode = 'login' }: { initialMode?: Mode }) {
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('pereme-language') === 'en' ? 'en' : 'tr')
  const [mode, setMode] = useState<Mode>(initialMode)
  const [resetToken, setResetToken] = useState(() => initialMode === 'reset' ? new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '' : '')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const { login, register, logout, session, logoutReason } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const c = text[language]
  const recovery = mode === 'forgot' || mode === 'reset'
  const invalidLink = mode === 'reset' && !/^[a-fA-F0-9]{64}$/.test(resetToken)

  useEffect(() => {
    if (initialMode === 'reset') window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [initialMode])

  useEffect(() => {
    document.documentElement.lang = language
    setPageMetadata({ title: mode === 'login' ? language === 'tr' ? 'Giriş Yap' : 'Sign In' : c[mode], language, indexable: false })
    localStorage.setItem('pereme-language', language)
  }, [language, mode, c])

  useEffect(() => {
    if (session && !recovery) navigate(session.user.role === 'Admin' ? '/admin/tickets' : '/hesabim', { replace: true })
  }, [navigate, session, recovery])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    const form = event.currentTarget
    const data = new FormData(form)
    try {
      if (mode === 'forgot') {
        await apiRequest('/api/v1/auth/forgot-password', { method: 'POST', body: { email: String(data.get('email')).trim(), language } })
        setComplete(true)
        form.reset()
        return
      }
      if (mode === 'reset') {
        const password = String(data.get('password'))
        if (password !== String(data.get('confirmPassword'))) { setError(c.mismatch); return }
        if (!/\p{Lu}/u.test(password) || !/\p{Ll}/u.test(password) || !/\p{Nd}/u.test(password) || password.length < 8) { setError(c.policy); return }
        await apiRequest('/api/v1/auth/reset-password', { method: 'POST', body: { token: resetToken, password } })
        logout()
        setResetToken('')
        form.reset()
        setShowPassword(false)
        setComplete(true)
        return
      }
      const result = mode === 'login'
        ? await login(String(data.get('email')), String(data.get('password')))
        : await register({ email: String(data.get('email')), password: String(data.get('password')), firstName: String(data.get('firstName')), lastName: String(data.get('lastName') || '') })
      const requestedPath = (location.state as { from?: string } | null)?.from
      const safeRequestedPath = requestedPath?.startsWith('/') && !requestedPath.startsWith('//') && (result.user.role === 'Admin' || !requestedPath.startsWith('/admin')) ? requestedPath : null
      navigate(safeRequestedPath || (result.user.role === 'Admin' ? '/admin/tickets' : '/hesabim'), { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 429 ? c.tooMany
        : mode === 'reset' && caught instanceof ApiError && caught.status === 400 ? c.invalid
          : recovery ? c.failed : caught instanceof ApiError ? caught.message : c.failed)
    } finally { setLoading(false) }
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-visual__shade" />
        <Link to="/" className="login-back"><ArrowLeft size={18} /> {c.back}</Link>
        <div className="login-language"><Globe2 size={17} /><button className={language === 'tr' ? 'active' : ''} onClick={() => setLanguage('tr')}>TR</button><span>/</span><button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button></div>
        <div className="login-visual__content">
          <img src="/assets/pereme-logo.svg" alt="Dentur Pereme" />
          <div className="login-eyebrow"><Sparkles size={15} /> {c.eyebrow}</div>
          <h1>{c.title}</h1><p>{c.subtitle}</p>
          <div className="login-features">{[c.featureOne, c.featureTwo, c.featureThree].map((feature) => <span key={feature}><Check size={16} /> {feature}</span>)}</div>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          {recovery ? <Link className="login-recovery-back" to="/login"><ArrowLeft size={16} />{c.backLogin}</Link> : <div className="login-tabs" role="tablist">
            <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError('') }}>{c.login}</button>
            <button role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError('') }}>{c.register}</button>
          </div>}
          <div className="login-card__heading"><span>{recovery ? <LockKeyhole size={20} /> : <UserRound size={20} />}</span><div><h2>{c[mode]}</h2><p>{mode === 'forgot' ? c.forgotIntro : mode === 'reset' ? c.resetIntro : c.secure}</p></div></div>
          {mode === 'login' && logoutReason === 'email-updated' && <p className="login-password-hint" role="status">{c.emailUpdated}</p>}
          {mode === 'login' && logoutReason === 'password-updated' && <p className="login-password-hint" role="status">{c.passwordUpdated}</p>}
          {mode === 'login' && logoutReason === 'account-deleted' && <p className="login-password-hint" role="status">{c.accountDeleted}</p>}
          {complete ? <div className="login-success" role="status"><span>{mode === 'forgot' ? <Mail size={24} /> : <Check size={24} />}</span><p>{mode === 'forgot' ? c.sent : c.resetDone}</p>{mode === 'forgot' && <small>{c.sentHint}</small>}<Link className="login-submit" to="/login">{c.login}<ArrowRight size={18} /></Link></div>
            : invalidLink ? <div className="login-error" role="alert"><p>{c.invalid}</p><Link className="login-recovery-link" to="/sifremi-unuttum">{c.requestAgain}<ArrowRight size={16} /></Link></div>
              : <form onSubmit={submit}>
                {mode === 'register' && <div className="login-name-row"><label>{c.firstName}<input name="firstName" required maxLength={100} autoComplete="given-name" /></label><label>{c.lastName}<input name="lastName" maxLength={100} autoComplete="family-name" /></label></div>}
                {mode !== 'reset' && <label>{c.email}<input type="email" name="email" required maxLength={320} autoComplete="email" placeholder="ornek@email.com" /></label>}
                {mode !== 'forgot' && <label>{mode === 'reset' ? c.newPassword : c.password}<span className="password-input"><input type={showPassword ? 'text' : 'password'} name="password" required minLength={8} maxLength={128} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /><button type="button" aria-label={showPassword ? c.hide : c.show} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff /> : <Eye />}</button></span></label>}
                {mode === 'reset' && <label>{c.confirm}<input type={showPassword ? 'text' : 'password'} name="confirmPassword" required minLength={8} maxLength={128} autoComplete="new-password" /></label>}
                {(mode === 'register' || mode === 'reset') && <p className="login-password-hint">{c.passwordHint}</p>}
                {mode === 'login' && <Link className="login-forgot-link" to="/sifremi-unuttum">{c.forgot}</Link>}
                {error && <div className="login-error" role="alert">{error}{mode === 'reset' && <Link className="login-recovery-link" to="/sifremi-unuttum">{c.requestAgain}</Link>}</div>}
                <button className="login-submit" disabled={loading} type="submit">{loading ? <span className="button-spinner" /> : <>{mode === 'login' ? c.loginButton : mode === 'register' ? c.registerButton : mode === 'forgot' ? c.send : c.resetButton}<ArrowRight size={18} /></>}</button>
              </form>}
          <div className="login-security"><LockKeyhole size={14} /> SSL / TLS</div>
        </div>
      </section>
    </main>
  )
}
