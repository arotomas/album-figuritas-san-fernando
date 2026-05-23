import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { fetchProfile, restoreSupabaseSession } from '../services/supabase/auth'
import { touchProfileLogin } from '../services/supabase/profile'
import { isAdmin } from '../services/supabase/admin'
import { fetchPublicFigures } from '../services/supabase/figures'
import { pullRemoteAlbum } from '../services/supabase/sync'
import { supabaseLog } from '../utils/supabaseLog'
import { sessionDebug, inspectSupabaseAuthStorage } from '../utils/sessionDebug'
import { getSupabaseProjectRef } from '../utils/authDebug'
import { isProfileComplete } from '../utils/profileValidation'

/**
 * Restaura sesión remota persistida — nunca crea usuarios nuevos.
 */
export function useSupabaseBootstrap(enabled) {
  const setSupabaseAuth = useAppStore((state) => state.setSupabaseAuth)
  const replaceCatalogFromRemote = useAppStore((state) => state.replaceCatalogFromRemote)
  const mergeRemoteUserFigures = useAppStore((state) => state.mergeRemoteUserFigures)
  const login = useAppStore((state) => state.login)
  const user = useAppStore((state) => state.user)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function bootstrap() {
      try {
        supabaseLog.sync.info('bootstrap start')

        const result = await restoreSupabaseSession()
        if (cancelled) return

        if (!result?.session?.user?.id) {
          sessionDebug.error('bootstrap aborted — no persisted supabase session', {
            localUsername: user?.username ?? null,
          })
          return
        }

        const userId = result.session.user.id
        const profile = await fetchProfile(userId)
        const profileUsername = profile?.username?.trim()
        const localUsername = user?.username?.trim()

        if (!profile?.id) {
          sessionDebug.error('bootstrap profile missing', { userId })
          return
        }

        const admin = await isAdmin(userId)
        const remoteCatalog = await fetchPublicFigures()

        if (cancelled) return

        replaceCatalogFromRemote(remoteCatalog)
        setSupabaseAuth({ userId, isAdmin: admin, profile })

        const completed = isProfileComplete(profile)
        if (profileUsername && !localUsername) {
          login({ username: profileUsername, profileCompleted: completed })
        } else if (localUsername) {
          login({ username: localUsername, profileCompleted: completed })
        }

        await touchProfileLogin(userId)

        const remoteRows = await pullRemoteAlbum()
        if (cancelled) return

        if (remoteRows.length > 0) {
          mergeRemoteUserFigures(remoteRows)
        }

        sessionDebug.info('bootstrap complete', {
          userId,
          profileCompleted: completed,
          authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
        })

        supabaseLog.sync.info('bootstrap complete', {
          userId,
          isAdmin: admin,
          remoteFigures: remoteRows.length,
          remoteCatalog: remoteCatalog.length,
          profileCompleted: completed,
        })
      } catch (error) {
        sessionDebug.error('bootstrap failed', {
          message: error?.message ?? String(error),
        })
        console.warn('[figures-fallback]', 'bootstrap failed — keeping local catalog', JSON.stringify({
          message: error?.message ?? String(error),
          fallback: true,
        }))
        supabaseLog.sync.warn('bootstrap failed', {
          message: error?.message ?? String(error),
        })
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [
    enabled,
    login,
    mergeRemoteUserFigures,
    replaceCatalogFromRemote,
    setSupabaseAuth,
    user?.username,
  ])
}
