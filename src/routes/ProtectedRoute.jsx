import { Navigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

export function ProtectedRoute({ children }) {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

export function GuestRoute({ children }) {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/map" replace />
  }

  return children
}
