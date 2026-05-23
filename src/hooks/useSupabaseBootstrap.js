import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import {
  ensureAnonymousSession,
  fetchProfile,
  isSupabaseConfigured,
} from '../services/supabase/auth'
import { isAdmin } from '../services/supabase/admin'
import { pullRemoteAlbum } from '../services/supabase/sync'
import { supabaseLog } from '../utils/supabaseLog'

/**
 * Restaura sesión remota y sincroniza álbum cuando el usuario ya ingresó.
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

      try {
        supabaseLog.sync.info('bootstrap start')

        const result = await ensureAnonymousSession()
        if (cancelled || !result?.session?.user?.id) return

        const userId = result.session.user.id
        const admin = await isAdmin(userId)

        if (cancelled) return

        setSupabaseAuth({ userId, isAdmin: admin })

        const profile = result.profile ?? (await fetchProfile(userId))
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

        supabaseLog.sync.info('bootstrap complete', {
          userId,
          isAdmin: admin,
          remoteFigures: remoteRows.length,
        })
      } catch (error) {
        supabaseLog.sync.warn('bootstrap failed — local fallback', {
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
