import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { apiRequest } from '../lib/api'

export type UserRole = 'Admin' | 'User'

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
  logout: () => void
}

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

  const saveSession = (nextSession: AuthSession) => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(nextSession))
    setSession(nextSession)
    return nextSession
  }

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
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
    logout() {
      window.sessionStorage.removeItem(storageKey)
      setSession(null)
    },
  }), [session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Shared hook intentionally lives with its provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
