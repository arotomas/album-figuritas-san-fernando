import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import {
  fetchProfile,
  isSupabaseConfigured,
  restoreSupabaseSession,
} from '../services/supabase/auth'
import { isAdmin } from '../services/supabase/admin'
import { pullRemoteAlbum } from '../services/supabase/sync'
import { supabaseLog } from '../utils/supabaseLog'
import { sessionDebug, inspectSupabaseAuthStorage } from '../utils/sessionDebug'
import { getSupabaseProjectRef } from '../utils/authDebug'

/**
 * Restaura sesión remota persistida — nunca crea usuarios anónimos nuevos.
 */
export function useSupabaseBootstrap(enabled) {
  const setSupabaseAuth = useAppStore((state) => state.setSupabaseAuth)
  const mergeRemoteUserFigures = useAppStore((state) => state.mergeRemoteUserFigures)
  const login = useAppStore((state) => state.login)
  const user = useAppStore((state) => state.user)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function bootstrap() {
      if (!isSupabaseConfigured()) {
        supabaseLog.auth.warn('bootstrap skipped — not configured')
        return
      }

      sessionDebug.info('bootstrap after hydration', {
        authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
      })

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
        const admin = await isAdmin(userId)

        if (cancelled) return

        setSupabaseAuth({ userId, isAdmin: admin })

        const profile = await fetchProfile(userId)
        const profileUsername = profile?.username?.trim()
        const localUsername = user?.username?.trim()

        if (profileUsername && !localUsername) {
          login({ username: profileUsername })
        }

        const remoteRows = await pullRemoteAlbum()
        if (cancelled) return

        if (remoteRows.length > 0) {
          mergeRemoteUserFigures(remoteRows)
        }

        sessionDebug.info('bootstrap complete', {
          userId,
          authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
        })

        supabaseLog.sync.info('bootstrap complete', {
          userId,
          isAdmin: admin,
          remoteFigures: remoteRows.length,
        })
      } catch (error) {
        sessionDebug.error('bootstrap failed', {
          message: error?.message ?? String(error),
        })
        supabaseLog.sync.warn('bootstrap failed', {
          message: error?.message ?? String(error),
        })
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [enabled, login, mergeRemoteUserFigures, setSupabaseAuth, user?.username])
}
