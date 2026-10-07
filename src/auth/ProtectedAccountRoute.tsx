import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useEffect, useState } from 'react'

export default function ProtectedAccountRoute() {
  const { session } = useAuth()
  const location = useLocation()
  const [expired, setExpired] = useState(
    () =>
      !session ||
      !Number.isFinite(Date.parse(session.expiresAtUtc)) ||
      Date.parse(session.expiresAtUtc) <= Date.now(),
  )
  useEffect(() => {
    if (!session) return
    const timer = window.setTimeout(
      () => setExpired(true),
      Math.min(
        2_147_483_647,
        Math.max(0, Date.parse(session.expiresAtUtc) - Date.now()),
      ),
    )
    return () => window.clearTimeout(timer)
  }, [session])
  if (!session || expired)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
