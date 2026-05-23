import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import {
  fetchProfile,
  restoreSupabaseSession,
  signOutSupabase,
} from '../services/supabase/auth'
import { touchProfileLogin } from '../services/supabase/profile'
import { isAdmin, isModeratorOrAdmin } from '../services/supabase/admin'
import { fetchPublicFigures } from '../services/supabase/figures'
import { pullRemoteAlbum } from '../services/supabase/sync'
import { supabaseLog } from '../utils/supabaseLog'
import { authLog } from '../utils/authLog'
import { isProfileComplete } from '../utils/profileValidation'

/**
 * Restaura sesión Supabase al iniciar la app.
 * Solo cuentas reales (email/Google). Sesiones anónimas legacy se cierran.
 */
export function useSupabaseBootstrap(enabled) {
  const setSupabaseAuth = useAppStore((state) => state.setSupabaseAuth)
  const setAuthBootstrapped = useAppStore((state) => state.setAuthBootstrapped)
  const clearAuthState = useAppStore((state) => state.clearAuthState)
  const replaceCatalogFromRemote = useAppStore((state) => state.replaceCatalogFromRemote)
  const mergeRemoteUserFigures = useAppStore((state) => state.mergeRemoteUserFigures)
  const login = useAppStore((state) => state.login)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function bootstrap() {
      setAuthBootstrapped(false)

      try {
        supabaseLog.sync.info('bootstrap start')

        const result = await restoreSupabaseSession()
        if (cancelled) return

        if (!result?.session?.user?.id) {
          clearAuthState()
          return
        }

        if (result.user?.is_anonymous) {
          authLog.info('legacy anonymous session cleared — real auth required')
          await signOutSupabase().catch(() => {})
          clearAuthState()
          return
        }

        const userId = result.session.user.id
        const profile = await fetchProfile(userId)

        if (!profile?.id) {
          authLog.error('bootstrap profile missing', { userId })
          clearAuthState()
          return
        }

        const admin = await isAdmin(userId)
        const moderatorOrAdmin = await isModeratorOrAdmin(userId)
        const remoteCatalog = await fetchPublicFigures()

        if (cancelled) return

        replaceCatalogFromRemote(remoteCatalog)
        setSupabaseAuth({
          userId,
          isAdmin: admin,
          isModeratorOrAdmin: moderatorOrAdmin,
          profile,
        })

        const completed = isProfileComplete(profile)
        login({
          username: profile.username ?? profile.email ?? result.user.email ?? 'explorador',
          profileCompleted: completed,
        })

        await touchProfileLogin(userId)

        const remoteRows = await pullRemoteAlbum()
        if (cancelled) return

        if (remoteRows.length > 0) {
          mergeRemoteUserFigures(remoteRows)
        }

        supabaseLog.sync.info('bootstrap complete', {
          userId,
          isAdmin: admin,
          remoteFigures: remoteRows.length,
          remoteCatalog: remoteCatalog.length,
          profileCompleted: completed,
        })
      } catch (error) {
        authLog.error('bootstrap failed', { message: error?.message ?? String(error) })
        clearAuthState()
      } finally {
        if (!cancelled) {
          setAuthBootstrapped(true)
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [
    enabled,
    clearAuthState,
    login,
    mergeRemoteUserFigures,
    replaceCatalogFromRemote,
    setAuthBootstrapped,
    setSupabaseAuth,
  ])
}
