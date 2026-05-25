import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import {
  fetchProfile,
  restoreSupabaseSession,
  signOutSupabase,
} from '../services/supabase/auth'
import { ensureProfileFromAuthUser, touchProfileLogin } from '../services/supabase/profile'
import { isAdmin, isModeratorOrAdmin } from '../services/supabase/admin'
import { fetchPublicFigures } from '../services/supabase/figures'
import { fetchAlbumCollectionsSafe } from '../services/supabase/collections'
import { setRemoteAlbumCollections } from '../utils/collectionRegistry'
import { pullRemoteAlbum } from '../services/supabase/sync'
import { hasStoredSupabaseSession } from '../services/supabase/sessionRestore'
import { supabaseLog } from '../utils/supabaseLog'
import { authLog } from '../utils/authLog'
import { authRestoreLog } from '../utils/authRestoreLog'
import { isProfileComplete } from '../utils/profileValidation'

async function hydrateAuthFromSession({ session, user, setSupabaseAuth, login, replaceCatalogFromRemote, mergeRemoteUserFigures }) {
  const userId = session.user.id
  let profile = await fetchProfile(userId)

  if (!profile?.id) {
    const provider =
      user.app_metadata?.provider === 'google' || user.identities?.some((i) => i.provider === 'google')
        ? 'google'
        : 'email'
    profile = await ensureProfileFromAuthUser(user, provider)
  }

  const admin = await isAdmin(userId)
  const moderatorOrAdmin = await isModeratorOrAdmin(userId)
  const remoteCatalog = await fetchPublicFigures()

  replaceCatalogFromRemote(remoteCatalog)

  const collectionsResult = await fetchAlbumCollectionsSafe()
  if (collectionsResult.collections) {
    setRemoteAlbumCollections(collectionsResult.collections, {
      reason: collectionsResult.reason,
    })
  }

  setSupabaseAuth({
    userId,
    isAdmin: admin,
    isModeratorOrAdmin: moderatorOrAdmin,
    profile,
  })

  const completed = isProfileComplete(profile)
  login({
    username: profile?.username ?? profile?.email ?? user.email ?? 'explorador',
    profileCompleted: completed,
  })

  authRestoreLog.info('profile loaded', {
    userId,
    profileCompleted: completed,
    role: profile?.role ?? null,
  })

  await touchProfileLogin(userId)

  const remoteRows = await pullRemoteAlbum()
  if (remoteRows.length > 0) {
    mergeRemoteUserFigures(remoteRows)
  }

  if (!completed) {
    authRestoreLog.info('redirect profile setup', { userId })
  } else {
    authRestoreLog.info('redirect app', { userId })
  }

  supabaseLog.sync.info('bootstrap complete', {
    userId,
    isAdmin: admin,
    remoteFigures: remoteRows.length,
    remoteCatalog: remoteCatalog.length,
    profileCompleted: completed,
  })
}

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
      try {
        supabaseLog.sync.info('bootstrap start')

        const result = await restoreSupabaseSession()
        if (cancelled) return

        if (!result?.session?.user?.id) {
          authRestoreLog.info('no session')
          clearAuthState()
          return
        }

        if (result.user?.is_anonymous) {
          authLog.info('legacy anonymous session cleared — real auth required')
          await signOutSupabase().catch(() => {})
          clearAuthState()
          return
        }

        await hydrateAuthFromSession({
          session: result.session,
          user: result.user,
          setSupabaseAuth,
          login,
          replaceCatalogFromRemote,
          mergeRemoteUserFigures,
        })
      } catch (error) {
        authLog.error('bootstrap failed', { message: error?.message ?? String(error) })

        const sessionStillPresent = await hasStoredSupabaseSession()
        if (sessionStillPresent) {
          authRestoreLog.info('session found', {
            recoveredAfterError: true,
            message: error?.message ?? String(error),
          })

          try {
            const retry = await restoreSupabaseSession()
            if (!cancelled && retry?.session?.user?.id && !retry.user?.is_anonymous) {
              await hydrateAuthFromSession({
                session: retry.session,
                user: retry.user,
                setSupabaseAuth,
                login,
                replaceCatalogFromRemote,
                mergeRemoteUserFigures,
              })
              return
            }
          } catch (retryError) {
            authRestoreLog.error('bootstrap retry failed', {
              message: retryError?.message ?? String(retryError),
            })
          }
        } else {
          authRestoreLog.info('no session')
        }

        if (!cancelled) clearAuthState()
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

  useEffect(() => {
    if (!enabled) return

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        authRestoreLog.info('no session', { reason: 'signed_out_event' })
        clearAuthState()
      }

      if (event === 'TOKEN_REFRESHED' && session?.user?.id) {
        authRestoreLog.info('session found', {
          reason: 'token_refreshed',
          userId: session.user.id,
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [clearAuthState, enabled])
}
