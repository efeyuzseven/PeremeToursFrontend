import { ArrowRight, Globe2, Menu, UserRound, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { panelHome } from '../auth/roles'
import { pagePath } from '../lib/content-pages'
import { mainNavigation, useAnnouncementsAvailable, useFooterPages } from '../lib/navigation'
import { SITE_NAME } from '../lib/site'
import AccountMenu from '../components/AccountMenu'
import './info-pages.css'

export type PublicLanguage = 'tr' | 'en'

type PublicPageLayoutProps = {
  children: (language: PublicLanguage) => ReactNode
  // Pages whose address carries the language (/en/blog/...) control it themselves and navigate on change.
  language?: PublicLanguage
  onLanguageChange?: (language: PublicLanguage) => void
}

const copy = {
  tr: {
    home: 'Ana sayfa', tours: 'Turlar', faq: 'Sıkça Sorulanlar', contact: 'İletişim',
    account: 'Hesabım', admin: 'Yönetim paneli', menu: 'Menüyü aç', close: 'Menüyü kapat',
    tagline: 'İstanbul’un en güzel haline, denizden tanış.', explore: 'Keşfet', support: 'Destek', kvkk: 'KVKK Aydınlatma Metni', contract: 'Mesafeli Satış Sözleşmesi',
  },
  en: {
    home: 'Home', tours: 'Tours', faq: 'FAQ', contact: 'Contact',
    account: 'My account', admin: 'Admin panel', menu: 'Open menu', close: 'Close menu',
    tagline: 'Meet Istanbul at its best, from the water.', explore: 'Explore', support: 'Support', kvkk: 'KVKK Notice', contract: 'Distance Sales Agreement',
  },
}

export default function PublicPageLayout({ children, language: controlledLanguage, onLanguageChange }: PublicPageLayoutProps) {
  const [storedLanguage, setStoredLanguage] = useState<PublicLanguage>(() => localStorage.getItem('pereme-language') === 'en' ? 'en' : 'tr')
  const language = controlledLanguage ?? storedLanguage
  const setLanguage = (next: PublicLanguage) => { if (onLanguageChange) onLanguageChange(next); else setStoredLanguage(next) }
  const [menuOpen, setMenuOpen] = useState(false)
  const { user } = useAuth()
  const c = copy[language]
  const navigation = mainNavigation(language, useAnnouncementsAvailable())
  const footerPages = useFooterPages(language)

  useEffect(() => {
    document.documentElement.lang = language
    localStorage.setItem('pereme-language', language)
  }, [language])

  const closeMenu = () => setMenuOpen(false)

  return <div className="info-page" id="top">
    <header className="info-header">
      <div className="shell info-header__inner">
        <Link className="info-logo" to="/" aria-label={c.home}><img src="/assets/pereme-logo.svg" alt="Dentur Pereme" /></Link>
        <nav aria-label={c.explore}>
          {navigation.map(item => <Link key={item.href} to={item.href}>{item.label}</Link>)}
        </nav>
        <div className="info-header__actions">
          <AccountMenu language={language} />
          <div className="info-language"><Globe2 />{(['tr', 'en'] as PublicLanguage[]).map((item) => <button className={language === item ? 'active' : ''} type="button" key={item} onClick={() => setLanguage(item)}>{item.toUpperCase()}</button>)}</div>
          <button className="info-menu-button" type="button" aria-label={c.menu} onClick={() => setMenuOpen(true)}><Menu /></button>
        </div>
      </div>
    </header>

    <aside className={`info-mobile-menu ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
      <button type="button" aria-label={c.close} onClick={closeMenu}><X /></button>
      <nav aria-label={c.account}><Link to={user ? '/hesabim' : '/login'} onClick={closeMenu}>{c.account}<UserRound /></Link>{panelHome(user?.role) && <Link to={panelHome(user?.role)!} onClick={closeMenu}>{c.admin}<ArrowRight /></Link>}</nav>
      <nav><Link to="/" onClick={closeMenu}>{c.home}<ArrowRight /></Link>{navigation.map(item => <Link key={item.href} to={item.href} onClick={closeMenu}>{item.label}<ArrowRight /></Link>)}</nav>
      <div>{(['tr', 'en'] as PublicLanguage[]).map((item) => <button className={language === item ? 'active' : ''} type="button" key={item} onClick={() => setLanguage(item)}>{item.toUpperCase()}</button>)}</div>
    </aside>

    <main>{children(language)}</main>

    <footer className="info-footer">
      <div className="shell info-footer__grid">
        <div><img src="/assets/pereme-logo.svg" alt="Dentur Pereme" /><p>{c.tagline}</p><a href="mailto:merhaba@peremetours.com">merhaba@peremetours.com</a></div>
        <div><strong>{c.explore}</strong>{navigation.filter(item => !['/sikca-sorulan-sorular', '/iletisim'].includes(item.href)).map(item => <Link key={item.href} to={item.href}>{item.label}</Link>)}
          {footerPages.map(page => <Link key={page.slug} to={pagePath(language, page.slug)}>{page.title}</Link>)}</div>
        <div><strong>{c.support}</strong><Link to="/sikca-sorulan-sorular">{c.faq}</Link><Link to="/iletisim">{c.contact}</Link><Link to="/kvkk-aydinlatma-metni">{c.kvkk}</Link><Link to="/mesafeli-satis-sozlesmesi">{c.contract}</Link></div>
      </div>
      <div className="shell info-footer__bottom">© 2026 {SITE_NAME}</div>
    </footer>
  </div>
}
