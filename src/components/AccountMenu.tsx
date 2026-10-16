import { ChevronDown, LayoutDashboard, LogOut, Ticket, UserRound } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { panelHome } from '../auth/roles'
import './account-menu.css'

export default function AccountMenu({ language, label }: { language: 'tr' | 'en'; label?: string }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()
  const tr = language === 'tr'
  const account = label ?? (tr ? 'Hesabım' : 'My account')
  const adminHome = panelHome(user?.role)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !user) return
    event.preventDefault()
    const focusItem = () => {
      const items = Array.from(container.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
      const current = items.indexOf(document.activeElement as HTMLElement)
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
        : event.key === 'ArrowDown' ? (current + 1) % items.length : (current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length)
      items[index]?.focus()
    }
    if (!open) { setOpen(true); requestAnimationFrame(focusItem) } else focusItem()
  }
  return <div className="nav-account" ref={container} onKeyDown={keyboard} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }}>
    {adminHome && <Link className="nav-account__admin" to={adminHome}>
      <LayoutDashboard size={16} /><span>{tr ? 'Yönetim Paneli' : 'Admin panel'}</span>
    </Link>}
    {user ? <div className="nav-account__dropdown">
      <button className="nav-account__trigger" type="button" ref={trigger} aria-expanded={open}
        aria-haspopup="menu" aria-controls={open ? id : undefined} onClick={() => setOpen((value) => !value)}>
        <UserRound size={16} /><span>{account}</span><ChevronDown size={13} />
      </button>
      {open && <div className="nav-account__menu" id={id} role="menu" aria-label={account}>
        <div className="nav-account__identity">{user.firstName} {user.lastName}</div>
        <Link role="menuitem" to="/hesabim#kisisel-bilgilerim" onClick={() => setOpen(false)}><UserRound size={17} />{tr ? 'Kişisel bilgilerim' : 'Personal details'}</Link>
        <Link role="menuitem" to="/hesabim#rezervasyonlarim" onClick={() => setOpen(false)}><Ticket size={17} />{tr ? 'Rezervasyonlarım' : 'My bookings'}</Link>
        <button role="menuitem" type="button" onClick={() => { setOpen(false); logout(); navigate('/login', { replace: true }) }}><LogOut size={17} />{tr ? 'Çıkış yap' : 'Sign out'}</button>
      </div>}
    </div> : <Link className="nav-account__trigger" to="/login"><UserRound size={16} /><span>{account}</span></Link>}
  </div>
}
