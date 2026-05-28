import { Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { getPostAuthPathFromStore } from '../utils/postAuthRedirect'

export function ProtectedRoute({ children, requireCompleteProfile = true }) {
  const authBootstrapped = useAppStore((state) => state.authBootstrapped)
  const supabaseReady = useAppStore((state) => state.supabaseReady)
  const supabaseUserId = useAppStore((state) => state.supabaseUserId)
  const profileCompleted = useAppStore((state) => state.profileCompleted)
  const isSupabaseAdmin = useAppStore((state) => state.isSupabaseAdmin)
  const isSupabaseModerator = useAppStore((state) => state.isSupabaseModerator)
  const location = useLocation()

  if (!authBootstrapped) {
    return null
  }

  if (!supabaseReady || !supabaseUserId) {
    return <Navigate to={`/login${location.search}`} replace />
  }

  if (requireCompleteProfile && !profileCompleted && !isSupabaseAdmin && !isSupabaseModerator) {
    return <Navigate to={`/profile-setup${location.search}`} replace />
  }

  return children
}

export function ProfileSetupRoute({ children }) {
  const authBootstrapped = useAppStore((state) => state.authBootstrapped)
  const supabaseReady = useAppStore((state) => state.supabaseReady)
  const supabaseUserId = useAppStore((state) => state.supabaseUserId)
  const profileCompleted = useAppStore((state) => state.profileCompleted)
  const location = useLocation()

  if (!authBootstrapped) {
    return null
  }

  if (!supabaseReady || !supabaseUserId) {
    return <Navigate to={`/login${location.search}`} replace />
  }

  if (profileCompleted) {
    const target = getPostAuthPathFromStore(
      {
        supabaseProfile: useAppStore.getState().supabaseProfile,
        profileCompleted: true,
      },
      location.search,
    )
    return <Navigate to={target} replace />
  }

  return children
}

export function GuestRoute({ children }) {
  const authBootstrapped = useAppStore((state) => state.authBootstrapped)
  const supabaseReady = useAppStore((state) => state.supabaseReady)
  const supabaseUserId = useAppStore((state) => state.supabaseUserId)
  const profileCompleted = useAppStore((state) => state.profileCompleted)
  const location = useLocation()

  if (!authBootstrapped) {
    return null
  }

  if (supabaseReady && supabaseUserId) {
    const target = getPostAuthPathFromStore(
      {
        supabaseProfile: useAppStore.getState().supabaseProfile,
        profileCompleted,
      },
      location.search,
    )
    return <Navigate to={target} replace />
  }

  return children
}
