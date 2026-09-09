import { ArrowUpRight, Globe2, Images, LayoutDashboard, LogOut, Menu, ShipWheel, TicketCheck, UsersRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './admin.css'

export type AdminLanguage = 'tr' | 'en'

const copy = {
  tr: { panel: 'Yönetim Paneli', tickets: 'Tur Biletleri', tourContents: 'Tur İçerikleri', users: 'Kullanıcılar', home: 'Siteyi görüntüle', logout: 'Çıkış yap', workspace: 'Operasyon merkezi' },
  en: { panel: 'Admin Panel', tickets: 'Tour Tickets', tourContents: 'Tour Content', users: 'Users', home: 'View website', logout: 'Sign out', workspace: 'Operations hub' },
}

export default function AdminLayout() {
  const [language, setLanguage] = useState<AdminLanguage>(() => localStorage.getItem('pereme-language') === 'en' ? 'en' : 'tr')
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const c = copy[language]

  useEffect(() => {
    document.documentElement.lang = language
    localStorage.setItem('pereme-language', language)
  }, [language])

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="admin-shell">
      <button className="admin-mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Menüyü aç"><Menu /></button>
      <aside className={`admin-sidebar ${menuOpen ? 'admin-sidebar--open' : ''}`}>
        <button className="admin-sidebar__close" onClick={() => setMenuOpen(false)} aria-label="Menüyü kapat"><X /></button>
        <Link className="admin-brand" to="/">
          <img src="/assets/pereme-logo.svg" alt="Dentur Pereme" />
          <span>{c.panel}</span>
        </Link>
        <div className="admin-workspace"><span><ShipWheel size={17} /></span><div><small>PEREME TOURS</small><strong>{c.workspace}</strong></div></div>
        <nav className="admin-nav">
          <span>MENU</span>
          <NavLink to="/admin/tickets" onClick={() => setMenuOpen(false)}><TicketCheck /> {c.tickets}</NavLink>
          <NavLink to="/admin/tour-contents" onClick={() => setMenuOpen(false)}><Images /> {c.tourContents}</NavLink>
          <NavLink to="/admin/users" onClick={() => setMenuOpen(false)}><UsersRound /> {c.users}</NavLink>
        </nav>
        <div className="admin-sidebar__bottom">
          <Link to="/"><ArrowUpRight /> {c.home}</Link>
          <button onClick={signOut}><LogOut /> {c.logout}</button>
        </div>
      </aside>
      {menuOpen && <button className="admin-sidebar-backdrop" aria-label="Menüyü kapat" onClick={() => setMenuOpen(false)} />}

      <div className="admin-main">
        <header className="admin-topbar">
          <div><span><LayoutDashboard size={16} /></span><p>{c.panel}</p></div>
          <div className="admin-topbar__actions">
            <div className="admin-language"><Globe2 size={16} /><button className={language === 'tr' ? 'active' : ''} onClick={() => setLanguage('tr')}>TR</button><i>/</i><button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button></div>
            <div className="admin-profile"><span>{user?.firstName.slice(0, 1)}{user?.lastName?.slice(0, 1)}</span><div><strong>{user?.firstName} {user?.lastName}</strong><small>{user?.email}</small></div></div>
          </div>
        </header>
        <main className="admin-content"><Outlet context={{ language }} /></main>
      </div>
    </div>
  )
}
