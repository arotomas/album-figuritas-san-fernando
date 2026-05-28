import { Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { getPostAuthPathFromStore } from '../utils/postAuthRedirect'

/** Ruta raíz: redirige según sesión Supabase real, rol y perfil completo. */
export function RootRedirect() {
  const authBootstrapped = useAppStore((state) => state.authBootstrapped)
  const supabaseReady = useAppStore((state) => state.supabaseReady)
  const location = useLocation()
  const storeSlice = useAppStore((state) => ({
    supabaseProfile: state.supabaseProfile,
    profileCompleted: state.profileCompleted,
  }))

  if (!authBootstrapped) {
    return null
  }

  if (!supabaseReady) {
    return <Navigate to={`/login${location.search}`} replace />
  }

  const target = getPostAuthPathFromStore(storeSlice, location.search)
  return <Navigate to={target} replace />
}
