import { useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import {
  fetchProfile,
  restoreSupabaseSession,
  signOutSupabase,
} from '../services/supabase/auth'
import { ensureProfileFromAuthUser, touchProfileLogin } from '../services/supabase/profile'
import { isAdmin, isModeratorOrAdmin } from '../services/supabase/admin'
import { bootstrapAlbumUniverse, syncAlbumUniverse } from '../utils/albumUniverseSync'
import { pullRemoteAlbum } from '../services/supabase/sync'
import { hasStoredSupabaseSession } from '../services/supabase/sessionRestore'
import { supabaseLog } from '../utils/supabaseLog'
import { authLog } from '../utils/authLog'
import { authRestoreLog } from '../utils/authRestoreLog'
import { isProfileComplete } from '../utils/profileValidation'
import {
  VISUAL_PREVIEW_ENABLED,
  seedVisualPreviewAuth,
} from '../dev/visualPreview'

async function syncRemoteUniverse(replaceCatalogFromRemote, getState, setAlbumState) {
  const preferredAlbumId = getState?.()?.activeAlbumId ?? null
  return bootstrapAlbumUniverse({
    replaceCatalogFromRemote,
    preferredAlbumId,
    setAlbumState,
  })
}

async function hydrateAuthFromSession({
  session,
  user,
  setSupabaseAuth,
  login,
  replaceCatalogFromRemote,
  mergeRemoteUserFigures,
  getState,
  setAlbumState,
}) {
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
  const { catalogCount } = await syncRemoteUniverse(
    replaceCatalogFromRemote,
    getState,
    setAlbumState,
  )

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
    remoteCatalog: catalogCount,
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
  const getState = useAppStore.getState
  const setAlbumState = useCallback(
    ({ publishedAlbums, activeAlbumId }) => {
      useAppStore.setState({ publishedAlbums, activeAlbumId })
    },
    [],
  )

  useEffect(() => {
    if (!enabled) return

    if (VISUAL_PREVIEW_ENABLED) {
      replaceCatalogFromRemote([])
      seedVisualPreviewAuth({
        setSupabaseAuth,
        login,
        setAuthBootstrapped,
        setAlbumState,
      })
      return undefined
    }

    let cancelled = false

    async function bootstrap() {
      try {
        supabaseLog.sync.info('bootstrap start')

        const result = await restoreSupabaseSession()
        if (cancelled) return

        if (!result?.session?.user?.id) {
          authRestoreLog.info('no session')
          clearAuthState()
          await syncRemoteUniverse(replaceCatalogFromRemote, getState, setAlbumState)
          return
        }

        if (result.user?.is_anonymous) {
          authLog.info('legacy anonymous session cleared — real auth required')
          await signOutSupabase().catch(() => {})
          clearAuthState()
          await syncRemoteUniverse(replaceCatalogFromRemote, getState, setAlbumState)
          return
        }

        await hydrateAuthFromSession({
          session: result.session,
          user: result.user,
          setSupabaseAuth,
          login,
          replaceCatalogFromRemote,
          mergeRemoteUserFigures,
          getState,
          setAlbumState,
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
                getState,
                setAlbumState,
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

        if (!cancelled) {
          clearAuthState()
          try {
            await syncRemoteUniverse(replaceCatalogFromRemote, getState, setAlbumState)
          } catch (catalogError) {
            authLog.error('catalog sync failed after bootstrap error', {
              message: catalogError?.message ?? String(catalogError),
            })
            replaceCatalogFromRemote([])
          }
        }
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
    getState,
    setAlbumState,
  ])

  useEffect(() => {
    if (!enabled) return

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        authRestoreLog.info('no session', { reason: 'signed_out_event' })
        clearAuthState()
        void bootstrapAlbumUniverse({
          replaceCatalogFromRemote: useAppStore.getState().replaceCatalogFromRemote,
          preferredAlbumId: useAppStore.getState().activeAlbumId,
          setAlbumState: ({ publishedAlbums, activeAlbumId }) => {
            useAppStore.setState({ publishedAlbums, activeAlbumId })
          },
        }).catch(() => useAppStore.getState().replaceCatalogFromRemote([]))
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
