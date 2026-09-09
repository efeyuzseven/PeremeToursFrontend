import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Globe2, LockKeyhole, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../lib/api'
import './login.css'

type Language = 'tr' | 'en'
type Mode = 'login' | 'register'

const text = {
  tr: {
    back: 'Siteye dön', eyebrow: 'Pereme hesabım', title: 'Boğaz deneyimin burada başlar.',
    subtitle: 'Rezervasyonlarını tek yerden takip et, yaklaşan turlarına kolayca ulaş.',
    login: 'Giriş yap', register: 'Hesap oluştur', email: 'E-posta adresi', password: 'Şifre',
    firstName: 'Ad', lastName: 'Soyad', loginButton: 'Hesabıma giriş yap', registerButton: 'Ücretsiz hesap oluştur',
    secure: 'Bilgilerin güvenli biçimde korunur.', admin: 'Yönetici hesabıyla giriş yaptığında admin paneline yönlendirilirsin.',
    featureOne: 'Biletlerine anında ulaş', featureTwo: 'Tur durumunu kolayca takip et', featureThree: 'Tercihlerini tek yerde yönet',
  },
  en: {
    back: 'Back to website', eyebrow: 'My Pereme account', title: 'Your Bosphorus story starts here.',
    subtitle: 'Keep your bookings together and reach every upcoming experience with ease.',
    login: 'Sign in', register: 'Create account', email: 'Email address', password: 'Password',
    firstName: 'First name', lastName: 'Last name', loginButton: 'Sign in to my account', registerButton: 'Create free account',
    secure: 'Your information is protected securely.', admin: 'Admin accounts are taken directly to the management panel.',
    featureOne: 'Reach your tickets instantly', featureTwo: 'Follow each tour with ease', featureThree: 'Manage preferences in one place',
  },
}

export default function LoginPage() {
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('pereme-language') === 'en' ? 'en' : 'tr')
  const [mode, setMode] = useState<Mode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login, register, session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const c = text[language]

  useEffect(() => {
    document.documentElement.lang = language
    document.title = language === 'tr' ? 'Giriş Yap — PeremeTours' : 'Sign In — PeremeTours'
    localStorage.setItem('pereme-language', language)
  }, [language])

  useEffect(() => {
    if (session) navigate(session.user.role === 'Admin' ? '/admin/tickets' : '/', { replace: true })
  }, [navigate, session])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    const data = new FormData(event.currentTarget)
    try {
      const result = mode === 'login'
        ? await login(String(data.get('email')), String(data.get('password')))
        : await register({
            email: String(data.get('email')),
            password: String(data.get('password')),
            firstName: String(data.get('firstName')),
            lastName: String(data.get('lastName') || ''),
          })
      const requestedPath = (location.state as { from?: string } | null)?.from
      navigate(result.user.role === 'Admin' ? requestedPath || '/admin/tickets' : '/', { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'İşlem tamamlanamadı.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-visual__shade" />
        <Link to="/" className="login-back"><ArrowLeft size={18} /> {c.back}</Link>
        <div className="login-language">
          <Globe2 size={17} />
          <button className={language === 'tr' ? 'active' : ''} onClick={() => setLanguage('tr')}>TR</button>
          <span>/</span>
          <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button>
        </div>
        <div className="login-visual__content">
          <img src="/assets/pereme-logo.svg" alt="Dentur Pereme" />
          <div className="login-eyebrow"><Sparkles size={15} /> {c.eyebrow}</div>
          <h1>{c.title}</h1>
          <p>{c.subtitle}</p>
          <div className="login-features">
            {[c.featureOne, c.featureTwo, c.featureThree].map((feature) => <span key={feature}><Check size={16} /> {feature}</span>)}
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-tabs" role="tablist">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError('') }}>{c.login}</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError('') }}>{c.register}</button>
          </div>

          <div className="login-card__heading">
            <span><UserRound size={20} /></span>
            <div><h2>{mode === 'login' ? c.login : c.register}</h2><p>{c.secure}</p></div>
          </div>

          <form onSubmit={submit}>
            {mode === 'register' && <div className="login-name-row">
              <label>{c.firstName}<input name="firstName" required maxLength={100} autoComplete="given-name" /></label>
              <label>{c.lastName}<input name="lastName" maxLength={100} autoComplete="family-name" /></label>
            </div>}
            <label>{c.email}<input type="email" name="email" required maxLength={320} autoComplete="email" placeholder="ornek@email.com" /></label>
            <label>{c.password}<span className="password-input"><input type={showPassword ? 'text' : 'password'} name="password" required minLength={8} maxLength={128} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /><button type="button" aria-label="Şifreyi göster" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff /> : <Eye />}</button></span></label>
            {error && <div className="login-error" role="alert">{error}</div>}
            <button className="login-submit" disabled={loading} type="submit">
              {loading ? <span className="button-spinner" /> : <>{mode === 'login' ? c.loginButton : c.registerButton}<ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="login-admin-note"><ShieldCheck size={20} /><p>{c.admin}</p></div>
          <div className="login-security"><LockKeyhole size={14} /> SSL / TLS</div>
        </div>
      </section>
    </main>
  )
}
