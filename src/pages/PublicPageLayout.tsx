import { ArrowRight, Globe2, Menu, UserRound, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './info-pages.css'

export type PublicLanguage = 'tr' | 'en'

type PublicPageLayoutProps = {
  children: (language: PublicLanguage) => ReactNode
}

const copy = {
  tr: {
    home: 'Ana sayfa', tours: 'Turlar', services: 'Hizmetlerimiz', faq: 'Sıkça Sorulanlar', contact: 'İletişim',
    account: 'Hesabım', admin: 'Yönetim paneli', menu: 'Menüyü aç', close: 'Menüyü kapat',
    tagline: 'İstanbul’un en güzel haline, denizden tanış.', explore: 'Keşfet', support: 'Destek', kvkk: 'KVKK Aydınlatma Metni',
  },
  en: {
    home: 'Home', tours: 'Tours', services: 'Our Services', faq: 'FAQ', contact: 'Contact',
    account: 'My account', admin: 'Admin panel', menu: 'Open menu', close: 'Close menu',
    tagline: 'Meet Istanbul at its best, from the water.', explore: 'Explore', support: 'Support', kvkk: 'KVKK Notice',
  },
}

export default function PublicPageLayout({ children }: PublicPageLayoutProps) {
  const [language, setLanguage] = useState<PublicLanguage>(() => localStorage.getItem('pereme-language') === 'en' ? 'en' : 'tr')
  const [menuOpen, setMenuOpen] = useState(false)
  const { user } = useAuth()
  const c = copy[language]

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
          <Link to="/#turlar">{c.tours}</Link><Link to="/#hizmetler">{c.services}</Link><Link to="/sikca-sorulan-sorular">{c.faq}</Link><Link to="/iletisim">{c.contact}</Link>
        </nav>
        <div className="info-header__actions">
          <Link to={user?.role === 'Admin' ? '/admin/tickets' : '/login'}><UserRound /> {user?.role === 'Admin' ? c.admin : c.account}</Link>
          <div className="info-language"><Globe2 />{(['tr', 'en'] as PublicLanguage[]).map((item) => <button className={language === item ? 'active' : ''} type="button" key={item} onClick={() => setLanguage(item)}>{item.toUpperCase()}</button>)}</div>
          <button className="info-menu-button" type="button" aria-label={c.menu} onClick={() => setMenuOpen(true)}><Menu /></button>
        </div>
      </div>
    </header>

    <aside className={`info-mobile-menu ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
      <button type="button" aria-label={c.close} onClick={closeMenu}><X /></button>
      <nav><Link to="/" onClick={closeMenu}>{c.home}<ArrowRight /></Link><Link to="/#turlar" onClick={closeMenu}>{c.tours}<ArrowRight /></Link><Link to="/#hizmetler" onClick={closeMenu}>{c.services}<ArrowRight /></Link><Link to="/sikca-sorulan-sorular" onClick={closeMenu}>{c.faq}<ArrowRight /></Link><Link to="/iletisim" onClick={closeMenu}>{c.contact}<ArrowRight /></Link></nav>
      <div>{(['tr', 'en'] as PublicLanguage[]).map((item) => <button className={language === item ? 'active' : ''} type="button" key={item} onClick={() => setLanguage(item)}>{item.toUpperCase()}</button>)}</div>
    </aside>

    <main>{children(language)}</main>

    <footer className="info-footer">
      <div className="shell info-footer__grid">
        <div><img src="/assets/pereme-logo.svg" alt="Dentur Pereme" /><p>{c.tagline}</p><a href="mailto:merhaba@peremetours.com">merhaba@peremetours.com</a></div>
        <div><strong>{c.explore}</strong><Link to="/#turlar">{c.tours}</Link><Link to="/#hizmetler">{c.services}</Link></div>
        <div><strong>{c.support}</strong><Link to="/sikca-sorulan-sorular">{c.faq}</Link><Link to="/iletisim">{c.contact}</Link><Link to="/kvkk-aydinlatma-metni">{c.kvkk}</Link></div>
      </div>
      <div className="shell info-footer__bottom">© 2026 PeremeTours</div>
    </footer>
  </div>
}
