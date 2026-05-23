import { Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

function hasRequiredUsername(user) {
  return Boolean(user?.username?.trim())
}

export function ProtectedRoute({ children }) {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)
  const user = useAppStore((state) => state.user)
  const location = useLocation()

  if (!isAuthenticated || !hasRequiredUsername(user)) {
    return <Navigate to={`/login${location.search}`} replace />
  }

  return children
}

export function GuestRoute({ children }) {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)
  const user = useAppStore((state) => state.user)
  const location = useLocation()

  if (isAuthenticated && hasRequiredUsername(user)) {
    return <Navigate to={`/map${location.search}`} replace />
  }

  return children
}
