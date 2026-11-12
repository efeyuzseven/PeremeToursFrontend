import { Camera } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { homepageTextFields } from '../content/homepage'
import { categoryPath } from '../content/tour-pages'
import { pagePath } from '../lib/content-pages'
import { useFooterPages, useHomepageTexts } from '../lib/navigation'
import { INSTAGRAM_HANDLE, INSTAGRAM_PROFILE_URL, X_HANDLE, X_PROFILE_URL } from '../lib/site'
import { XIcon } from './SocialLinks'

type Language = 'tr' | 'en'

// Built-in footer texts, used until (or unless) the saved homepage texts arrive.
const defaults = (language: Language): Record<string, string> =>
  Object.fromEntries(homepageTextFields.filter(field => field[0] === 'footer').map(field => [field[1], field[language === 'tr' ? 4 : 5]]))
const defaultTexts = { tr: defaults('tr'), en: defaults('en') }

// The one footer of the public site, on the homepage and every other page. Its texts are the homepage's saved
// footer texts: the homepage passes the ones it already loaded, other pages leave `texts` out and they are fetched.
export default function SiteFooter({ language, texts }: { language: Language; texts?: Record<string, string> | null }) {
  const fetched = useHomepageTexts(language, texts !== undefined)
  const footerPages = useFooterPages(language)
  const { pathname } = useLocation()
  const values = texts ?? fetched
  const t = (key: string) => values?.[key] ?? defaultTexts[language][key]
  const email = t('footer.email')
  const home = language === 'tr' ? 'Dentur Pereme ana sayfa' : 'Dentur Pereme home'
  const logo = <img src="/assets/pereme-logo.svg" alt="" />
  return <footer>
    <div className="shell footer__top">
      <div className="footer__brand">
        {pathname === '/' ? <a href="#top" className="logo logo--light" aria-label={home}>{logo}</a> : <Link to="/" className="logo logo--light" aria-label={home}>{logo}</Link>}
        <p>{t('footer.tagline').split('\n').map((line, index) => <span key={index}>{line}<br /></span>)}</p>
        <a href={`mailto:${encodeURIComponent(email).replaceAll('%40', '@')}`}>{email}</a>
      </div>
      <div className="footer__links">
        <div><strong>{t('footer.0.0')}</strong>
          <Link to={categoryPath('bosphorus')}>{t('footer.0.2')}</Link>
          <Link to={categoryPath('turkish-night')}>{t('footer.0.3')}</Link>
          <Link to={categoryPath('daytime')}>{t('footer.0.4')}</Link>
        </div>
        <div><strong>{t('footer.1.0')}</strong>
          <Link to="/sikca-sorulan-sorular">{t('footer.1.3')}</Link>
          <Link to="/iletisim">{t('footer.1.4')}</Link>
          <Link to={language === 'tr' ? '/blog' : '/en/blog'}>Blog</Link>
          {footerPages.map(page => <Link key={page.slug} to={pagePath(language, page.slug)}>{page.title}</Link>)}
        </div>
        <div><strong>{t('footer.2.0')}</strong>
          <Link to="/kvkk-aydinlatma-metni">{t('footer.2.1')}</Link>
          <Link to="/mesafeli-satis-sozlesmesi">{t('footer.2.2')}</Link>
        </div>
      </div>
    </div>
    <div className="shell footer__bottom"><span>{t('footer.copyright')}</span><div className="footer-social">
      <a className="footer-instagram" href={INSTAGRAM_PROFILE_URL} target="_blank" rel="noopener noreferrer"><Camera size={22} /> {INSTAGRAM_HANDLE}</a>
      <a className="footer-instagram" href={X_PROFILE_URL} target="_blank" rel="noopener noreferrer"><XIcon size={20} /> {X_HANDLE}</a>
    </div></div>
  </footer>
}
