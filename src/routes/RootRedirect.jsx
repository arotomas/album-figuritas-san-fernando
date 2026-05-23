import { Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { PageSkeleton } from '../components/performance/AppSkeleton'

/** Ruta raíz: redirige según sesión Supabase real y perfil completo. */
export function RootRedirect() {
  const authBootstrapped = useAppStore((state) => state.authBootstrapped)
  const supabaseReady = useAppStore((state) => state.supabaseReady)
  const profileCompleted = useAppStore((state) => state.profileCompleted)
  const location = useLocation()

  if (!authBootstrapped) {
    return <PageSkeleton />
  }

  if (!supabaseReady) {
    return <Navigate to={`/login${location.search}`} replace />
  }

  if (!profileCompleted) {
    return <Navigate to={`/profile-setup${location.search}`} replace />
  }

  return <Navigate to={`/map${location.search}`} replace />
}
