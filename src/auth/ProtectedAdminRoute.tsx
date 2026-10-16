import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { canAccessPanelPath, panelHome } from './roles'

export default function ProtectedAdminRoute() {
  const { session } = useAuth()
  const location = useLocation()

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  const home = panelHome(session.user.role)
  if (!home) {
    return <Navigate to="/" replace />
  }
  if (!canAccessPanelPath(session.user.role, location.pathname)) return <Navigate to={home} replace />
  return <Outlet />
}

export function PanelHomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={panelHome(user?.role) ?? '/'} replace />
}
