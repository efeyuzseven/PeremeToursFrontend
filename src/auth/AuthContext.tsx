import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { apiRequest } from '../lib/api'
import type { UserRole } from './roles'

export type { UserRole } from './roles'

export type AuthUser = {
  id: string
  email: string
  firstName: string
  lastName?: string | null
  role: UserRole
}

export type AuthSession = {
  user: AuthUser
  accessToken: string
  expiresAtUtc: string
}

type RegisterInput = {
  email: string
  password: string
  firstName: string
  lastName?: string
}

type AuthContextValue = {
  session: AuthSession | null
  user: AuthUser | null
  login: (email: string, password: string) => Promise<AuthSession>
  register: (input: RegisterInput) => Promise<AuthSession>
  logout: (reason?: LogoutReason) => void
  logoutReason: LogoutReason | null
  refreshUser: () => Promise<void>
  updateOwnProfile: (firstName: string, lastName: string | null) => void
}

type LogoutReason = 'email-updated' | 'password-updated' | 'account-deleted'

const storageKey = 'peremetours-session'
const AuthContext = createContext<AuthContextValue | null>(null)

function readSession(): AuthSession | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    if (new Date(session.expiresAtUtc).getTime() <= Date.now()) {
      window.sessionStorage.removeItem(storageKey)
      return null
    }
    return session
  } catch {
    window.sessionStorage.removeItem(storageKey)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(readSession)
  const [logoutReason, setLogoutReason] = useState<LogoutReason | null>(null)

  const saveSession = (nextSession: AuthSession) => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(nextSession))
    setLogoutReason(null)
    setSession(nextSession)
    return nextSession
  }

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    logoutReason,
    async login(email, password) {
      const result = await apiRequest<AuthSession>('/api/v1/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      return saveSession(result)
    },
    async register(input) {
      const result = await apiRequest<AuthSession>('/api/v1/auth/register', {
        method: 'POST',
        body: input,
      })
      return saveSession(result)
    },
    logout(reason) {
      window.sessionStorage.removeItem(storageKey)
      setLogoutReason(reason ?? null)
      setSession(null)
    },
    async refreshUser() {
      if (!session) return
      const user = await apiRequest<AuthUser>('/api/v1/auth/me', { token: session.accessToken, cache: 'no-store' })
      saveSession({ ...session, user })
    },
    updateOwnProfile(firstName, lastName) {
      if (session) saveSession({ ...session, user: { ...session.user, firstName, lastName } })
    },
  }), [session, logoutReason])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Shared hook intentionally lives with its provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
