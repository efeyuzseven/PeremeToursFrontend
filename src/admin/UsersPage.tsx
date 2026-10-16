import { Pencil, Search, ShieldCheck, UserCheck, UserPlus, UserRound, UsersRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth, type UserRole } from '../auth/AuthContext'
import { roleLabel, userRoles } from '../auth/roles'
import { apiRequest, ApiError } from '../lib/api'
import { setPageMetadata } from '../lib/site'
import type { AdminLanguage } from './AdminLayout'
import UserEditDialog, { type ManagedUser, type ProfileUpdate } from './UserEditDialog'
import UserCreateDialog from './UserCreateDialog'

const copy = {
  tr: { eyebrow: 'HESAP YÖNETİMİ', title: 'Kullanıcılar', subtitle: 'Üyeleri görüntüleyin, erişimlerini yönetin ve yönetici rollerini düzenleyin.', total: 'Toplam kullanıcı', active: 'Aktif hesap', admins: 'Yöneticiler', search: 'İsim veya e-posta ara...', user: 'Kullanıcı', joined: 'Kayıt tarihi', role: 'Rol', status: 'Hesap durumu', admin: 'Yönetici', customer: 'Kullanıcı', enabled: 'Aktif', disabled: 'Kapalı', empty: 'Aramanızla eşleşen kullanıcı bulunamadı.', error: 'Kullanıcılar yüklenemedi.', self: 'Bu hesap' },
  en: { eyebrow: 'ACCOUNT MANAGEMENT', title: 'Users', subtitle: 'View members, manage access and control administrator roles.', total: 'Total users', active: 'Active accounts', admins: 'Administrators', search: 'Search name or email...', user: 'User', joined: 'Joined', role: 'Role', status: 'Account status', admin: 'Admin', customer: 'User', enabled: 'Active', disabled: 'Disabled', empty: 'No users matched your search.', error: 'Users could not be loaded.', self: 'This account' },
}

export default function UsersPage() {
  const { language } = useOutletContext<{ language: AdminLanguage }>()
  const { session, refreshUser, logout } = useAuth()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState('')
  const [editing, setEditing] = useState<ManagedUser | null>(null)
  const [creating, setCreating] = useState(false)
  const [success, setSuccess] = useState('')
  const updating = useRef(false)
  const editTrigger = useRef<HTMLButtonElement | null>(null)
  const createTrigger = useRef<HTMLButtonElement | null>(null)
  const closeEditor = useCallback(() => setEditing(null), [])
  const closeCreator = useCallback(() => setCreating(false), [])
  const c = copy[language]

  useEffect(() => {
    setPageMetadata({ title: c.title, language, indexable: false })
  }, [c.title, language])

  useEffect(() => {
    let active = true
    apiRequest<ManagedUser[]>('/api/v1/admin/users', { token: session!.accessToken, cache: 'no-store' })
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
    if (updating.current || editing || creating) return
    updating.current = true
    setUpdatingId(user.id)
    setError('')
    setSuccess('')
    try {
      await apiRequest<void>(`/api/v1/admin/users/${user.id}`, { method: 'PATCH', token: session!.accessToken, body: change })
      setUsers((items) => items.map((item) => item.id === user.id ? { ...item, ...change } : item))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : c.error)
    } finally {
      updating.current = false
      setUpdatingId('')
    }
  }

  const profileSaved = async (profile: ProfileUpdate) => {
    if (!editing) return
    const self = editing.id === session!.user.id
    if (self && profile.email && profile.email.toUpperCase() !== editing.email.toUpperCase()) {
      logout('email-updated')
      return
    }
    setUsers((items) => items.map((item) => item.id === editing.id ? { ...item, ...profile, lastName: profile.lastName || null } : item))
    setSuccess(language === 'tr' ? 'Kullanıcı bilgileri güncellendi.' : 'User details updated.')
    try {
      const result = await apiRequest<ManagedUser[]>('/api/v1/admin/users', { token: session!.accessToken, cache: 'no-store' })
      setUsers(result)
      if (self) await refreshUser()
    } catch {
      setError(language === 'tr' ? 'Değişiklik kaydedildi ancak liste yenilenemedi. Sayfayı yenileyin.' : 'The change was saved, but the list could not be refreshed. Reload the page.')
    } finally { setEditing(null) }
  }

  const formatDate = (date: string) => new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
  const userCreated = (created: ManagedUser) => {
    setUsers(items => [created, ...items.filter(item => item.id !== created.id)])
    setQuery(''); setCreating(false); setError('')
    setSuccess(language === 'tr' ? 'Kullanıcı oluşturuldu. Seçilen rol ile giriş yapabilir.' : 'The user was created and can sign in with the selected role.')
  }
  const checkCreatedList = async (email: string) => {
    const result = await apiRequest<ManagedUser[]>('/api/v1/admin/users', { token: session!.accessToken, cache: 'no-store' })
    setUsers(result); setQuery(email); setCreating(false)
    setSuccess(language === 'tr' ? 'Liste yenilendi. Bu e-posta ile kayıt olup olmadığını kontrol edin.' : 'The list was refreshed. Check whether an account uses this email.')
  }

  return <>
    <div className="admin-page-heading"><div><span>{c.eyebrow}</span><h1>{c.title}</h1><p>{c.subtitle}</p></div><button ref={createTrigger} type="button" className="admin-primary-button" disabled={loading || !!updatingId || !!editing || creating} onClick={() => { setError(''); setSuccess(''); setCreating(true) }}><UserPlus size={18} />{language === 'tr' ? 'Yeni kullanıcı oluştur' : 'Create a new user'}</button></div>
    <div className="admin-stat-grid admin-stat-grid--three">
      <article><span className="stat-icon stat-icon--blue"><UsersRound /></span><div><small>{c.total}</small><strong>{users.length}</strong></div></article>
      <article><span className="stat-icon stat-icon--green"><UserCheck /></span><div><small>{c.active}</small><strong>{users.filter((user) => user.isActive).length}</strong></div></article>
      <article><span className="stat-icon stat-icon--violet"><ShieldCheck /></span><div><small>{c.admins}</small><strong>{users.filter((user) => user.role === 'Admin').length}</strong></div></article>
    </div>
    {error && <div className="admin-alert" role="alert">{error}</div>}
    {success && <div className="users-success" role="status">{success}</div>}
    <section className="admin-table-card">
      <div className="admin-table-tools"><label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.search} /></label></div>
      <div className="admin-table-scroll"><table><thead><tr><th>{c.user}</th><th>{c.joined}</th><th>{c.role}</th><th>{c.status}</th><th>{language === 'tr' ? 'İşlemler' : 'Actions'}</th></tr></thead><tbody>
        {loading && Array.from({ length: 4 }).map((_, index) => <tr className="table-skeleton" key={index}><td colSpan={5}><span /></td></tr>)}
        {!loading && visibleUsers.map((user) => { const isSelf = user.id === session!.user.id; const disabled = !!updatingId || !!editing; return <tr key={user.id}><td><div className="table-person table-person--user"><span>{user.firstName.slice(0, 1)}{user.lastName?.slice(0, 1)}</span><div><strong>{user.firstName} {user.lastName}{isSelf && <em>{c.self}</em>}</strong><small>{user.email}</small></div></div></td><td>{formatDate(user.createdAtUtc)}</td><td><select aria-label={`${c.role}: ${user.firstName} ${user.lastName ?? ''}`} className={`role-select role-${user.role.toLowerCase()}`} value={user.role} disabled={isSelf || disabled} onChange={(event) => void updateUser(user, { role: event.target.value as UserRole })}>{userRoles.map((role) => <option key={role} value={role}>{roleLabel(role, language)}</option>)}</select></td><td><button className={`account-toggle ${user.isActive ? 'active' : ''}`} disabled={isSelf || disabled} onClick={() => void updateUser(user, { isActive: !user.isActive })}><i /><span>{user.isActive ? c.enabled : c.disabled}</span></button></td><td><button type="button" className="user-edit-button" disabled={disabled} onClick={(event) => { editTrigger.current = event.currentTarget; setError(''); setSuccess(''); setEditing(user) }}><Pencil size={14} />{language === 'tr' ? 'Düzenle' : 'Edit'}</button></td></tr> })}
      </tbody></table></div>
      {!loading && visibleUsers.length === 0 && <div className="admin-empty"><UserRound /><p>{c.empty}</p></div>}
    </section>
    {editing && <UserEditDialog key={editing.id} user={editing} token={session!.accessToken} language={language} isSelf={editing.id === session!.user.id} returnFocus={editTrigger} onClose={closeEditor} onSaved={profileSaved} />}
    {creating && <UserCreateDialog token={session!.accessToken} language={language} returnFocus={createTrigger} onClose={closeCreator} onCreated={userCreated} onCheckList={checkCreatedList} />}
  </>
}
