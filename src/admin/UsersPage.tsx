import { Search, ShieldCheck, UserCheck, UserRound, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth, type UserRole } from '../auth/AuthContext'
import { apiRequest, ApiError } from '../lib/api'
import type { AdminLanguage } from './AdminLayout'

type ManagedUser = {
  id: string; email: string; firstName: string; lastName?: string | null
  role: UserRole; isActive: boolean; createdAtUtc: string
}

const copy = {
  tr: { eyebrow: 'HESAP YÖNETİMİ', title: 'Kullanıcılar', subtitle: 'Üyeleri görüntüleyin, erişimlerini yönetin ve yönetici rollerini düzenleyin.', total: 'Toplam kullanıcı', active: 'Aktif hesap', admins: 'Yöneticiler', search: 'İsim veya e-posta ara...', user: 'Kullanıcı', joined: 'Kayıt tarihi', role: 'Rol', status: 'Hesap durumu', admin: 'Yönetici', customer: 'Kullanıcı', enabled: 'Aktif', disabled: 'Kapalı', empty: 'Aramanızla eşleşen kullanıcı bulunamadı.', error: 'Kullanıcılar yüklenemedi.', self: 'Bu hesap' },
  en: { eyebrow: 'ACCOUNT MANAGEMENT', title: 'Users', subtitle: 'View members, manage access and control administrator roles.', total: 'Total users', active: 'Active accounts', admins: 'Administrators', search: 'Search name or email...', user: 'User', joined: 'Joined', role: 'Role', status: 'Account status', admin: 'Admin', customer: 'User', enabled: 'Active', disabled: 'Disabled', empty: 'No users matched your search.', error: 'Users could not be loaded.', self: 'This account' },
}

export default function UsersPage() {
  const { language } = useOutletContext<{ language: AdminLanguage }>()
  const { session } = useAuth()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState('')
  const c = copy[language]

  useEffect(() => {
    document.title = `${c.title} — PeremeTours`
  }, [c.title])

  useEffect(() => {
    let active = true
    apiRequest<ManagedUser[]>('/api/v1/admin/users', { token: session!.accessToken })
      .then((result) => { if (active) setUsers(result) })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.message : c.error) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [c.error, session])

  const visibleUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(language === 'tr' ? 'tr-TR' : 'en-US')
    return users.filter((user) => !normalized || `${user.firstName} ${user.lastName ?? ''} ${user.email}`.toLocaleLowerCase(language === 'tr' ? 'tr-TR' : 'en-US').includes(normalized))
  }, [language, query, users])

  const updateUser = async (user: ManagedUser, change: { role?: UserRole; isActive?: boolean }) => {
    setUpdatingId(user.id)
    setError('')
    try {
      await apiRequest<void>(`/api/v1/admin/users/${user.id}`, { method: 'PATCH', token: session!.accessToken, body: change })
      setUsers((items) => items.map((item) => item.id === user.id ? { ...item, ...change } : item))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : c.error)
    } finally {
      setUpdatingId('')
    }
  }

  const formatDate = (date: string) => new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))

  return <>
    <div className="admin-page-heading"><div><span>{c.eyebrow}</span><h1>{c.title}</h1><p>{c.subtitle}</p></div></div>
    <div className="admin-stat-grid admin-stat-grid--three">
      <article><span className="stat-icon stat-icon--blue"><UsersRound /></span><div><small>{c.total}</small><strong>{users.length}</strong></div></article>
      <article><span className="stat-icon stat-icon--green"><UserCheck /></span><div><small>{c.active}</small><strong>{users.filter((user) => user.isActive).length}</strong></div></article>
      <article><span className="stat-icon stat-icon--violet"><ShieldCheck /></span><div><small>{c.admins}</small><strong>{users.filter((user) => user.role === 'Admin').length}</strong></div></article>
    </div>
    {error && <div className="admin-alert">{error}</div>}
    <section className="admin-table-card">
      <div className="admin-table-tools"><label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.search} /></label></div>
      <div className="admin-table-scroll"><table><thead><tr><th>{c.user}</th><th>{c.joined}</th><th>{c.role}</th><th>{c.status}</th></tr></thead><tbody>
        {loading && Array.from({ length: 4 }).map((_, index) => <tr className="table-skeleton" key={index}><td colSpan={4}><span /></td></tr>)}
        {!loading && visibleUsers.map((user) => { const isSelf = user.id === session!.user.id; return <tr key={user.id}><td><div className="table-person table-person--user"><span>{user.firstName.slice(0, 1)}{user.lastName?.slice(0, 1)}</span><div><strong>{user.firstName} {user.lastName}{isSelf && <em>{c.self}</em>}</strong><small>{user.email}</small></div></div></td><td>{formatDate(user.createdAtUtc)}</td><td><select className={`role-select role-${user.role.toLowerCase()}`} value={user.role} disabled={isSelf || updatingId === user.id} onChange={(event) => void updateUser(user, { role: event.target.value as UserRole })}><option value="User">{c.customer}</option><option value="Admin">{c.admin}</option></select></td><td><button className={`account-toggle ${user.isActive ? 'active' : ''}`} disabled={isSelf || updatingId === user.id} onClick={() => void updateUser(user, { isActive: !user.isActive })}><i /><span>{user.isActive ? c.enabled : c.disabled}</span></button></td></tr> })}
      </tbody></table></div>
      {!loading && visibleUsers.length === 0 && <div className="admin-empty"><UserRound /><p>{c.empty}</p></div>}
    </section>
  </>
}
