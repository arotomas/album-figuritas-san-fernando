import { Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

export function ProtectedRoute({ children, requireCompleteProfile = true }) {
  const supabaseReady = useAppStore((state) => state.supabaseReady)
  const supabaseUserId = useAppStore((state) => state.supabaseUserId)
  const profileCompleted = useAppStore((state) => state.profileCompleted)
  const isSupabaseAdmin = useAppStore((state) => state.isSupabaseAdmin)
  const location = useLocation()

  if (!supabaseReady || !supabaseUserId) {
    return <Navigate to={`/login${location.search}`} replace />
  }

  if (
    requireCompleteProfile &&
    !profileCompleted &&
    !isSupabaseAdmin
  ) {
    return <Navigate to={`/profile-setup${location.search}`} replace />
  }

  return children
}

export function ProfileSetupRoute({ children }) {
  const supabaseReady = useAppStore((state) => state.supabaseReady)
  const supabaseUserId = useAppStore((state) => state.supabaseUserId)
  const profileCompleted = useAppStore((state) => state.profileCompleted)
  const location = useLocation()

  if (!supabaseReady || !supabaseUserId) {
    return <Navigate to={`/login${location.search}`} replace />
  }

  if (profileCompleted) {
    return <Navigate to={`/map${location.search}`} replace />
  }

  return children
}

export function GuestRoute({ children }) {
  const supabaseReady = useAppStore((state) => state.supabaseReady)
  const supabaseUserId = useAppStore((state) => state.supabaseUserId)
  const profileCompleted = useAppStore((state) => state.profileCompleted)
  const location = useLocation()

  if (supabaseReady && supabaseUserId) {
    if (!profileCompleted) {
      return <Navigate to={`/profile-setup${location.search}`} replace />
    }
    return <Navigate to={`/map${location.search}`} replace />
  }

  return children
}
