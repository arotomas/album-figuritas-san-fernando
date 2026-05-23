import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { ensureAnonymousSession, isSupabaseConfigured } from '../services/supabase/auth'
import { isAdmin } from '../services/supabase/admin'
import { pullRemoteAlbum } from '../services/supabase/sync'
import { supabaseLog } from '../utils/supabaseLog'

/**
 * Auth anónimo + pull del álbum remoto tras hidratar localStorage.
 * Falla en silencio — la app sigue con datos locales.
 */
export function useSupabaseBootstrap(enabled) {
  const setSupabaseAuth = useAppStore((state) => state.setSupabaseAuth)
  const mergeRemoteUserFigures = useAppStore((state) => state.mergeRemoteUserFigures)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!enabled || startedRef.current) return
    startedRef.current = true

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
  }, [enabled, mergeRemoteUserFigures, setSupabaseAuth])
}
