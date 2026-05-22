import { Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

export function ProtectedRoute({ children }) {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to={`/login${location.search}`} replace />
  }

  return children
}

export function GuestRoute({ children }) {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)
  const location = useLocation()

  if (isAuthenticated) {
    return <Navigate to={`/map${location.search}`} replace />
  }

  return children
}
