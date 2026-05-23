import { useCallback, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { isQaMode, withQaParam } from '../utils/qaMode'
import {
  isSupabaseConfigured,
  loginWithUsername,
  signOutSupabase,
} from '../services/supabase/auth'
import { isAdmin } from '../services/supabase/admin'
import { pullRemoteAlbum } from '../services/supabase/sync'
import { authLog } from '../utils/authLog'
import { authDebug } from '../utils/authDebug'
import { sessionDebug, inspectSupabaseAuthStorage } from '../utils/sessionDebug'
import { getSupabaseProjectRef } from '../utils/authDebug'

const SERVER_ERROR_MESSAGE =
  'No pudimos conectar con el servidor. Probá de nuevo.'

function formatAuthError(error) {
  const parts = [
    error?.message,
    error?.code,
    error?.status ? `status ${error.status}` : null,
  ].filter(Boolean)
  return parts.join(' · ') || SERVER_ERROR_MESSAGE
}

export function useAuth() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAppStore((state) => state.login)
  const logout = useAppStore((state) => state.logout)
  const setSupabaseAuth = useAppStore((state) => state.setSupabaseAuth)
  const mergeRemoteUserFigures = useAppStore((state) => state.mergeRemoteUserFigures)
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)
  const user = useAppStore((state) => state.user)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogin = useCallback(
    async ({ username, address = null }) => {
      const trimmed = username?.trim()
      if (!trimmed) {
        return { ok: false, message: 'Escribí tu nombre o apodo para entrar.' }
      }

      if (!isSupabaseConfigured()) {
        authLog.error('login blocked — supabase env vars missing')
        authDebug.error('login blocked — supabase env vars missing')
        return {
          ok: false,
          message: `${SERVER_ERROR_MESSAGE} (Supabase no configurado en build)`,
        }
      }

      setIsSubmitting(true)

      try {
        const { userId, profile, session, user: authUser } = await loginWithUsername(
          trimmed,
          address,
        )

        if (!session?.user?.id || !profile?.id || !authUser?.id) {
          authLog.error('login blocked — verification incomplete after auth')
          authDebug.error('login blocked — verification incomplete', {
            sessionUserId: session?.user?.id ?? null,
            profileId: profile?.id ?? null,
            authUserId: authUser?.id ?? null,
          })
          return {
            ok: false,
            message: `${SERVER_ERROR_MESSAGE} (verificación incompleta)`,
          }
        }

        const admin = await isAdmin(userId)
        setSupabaseAuth({ userId, isAdmin: admin, profile })

        try {
          const remoteRows = await pullRemoteAlbum()
          if (remoteRows.length > 0) {
            mergeRemoteUserFigures(remoteRows)
          }
        } catch (syncError) {
          authDebug.error('album pull after login failed', {
            error: syncError?.message ?? String(syncError),
          })
        }

        login({ username: profile.username ?? trimmed })

        sessionDebug.info('after login store update — before navigation', {
          authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
        })

        navigate(withQaParam('/map', isQaMode(location.search)), { replace: true })

        sessionDebug.info('after navigation scheduled', {
          authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
        })

        return { ok: true }
      } catch (error) {
        authLog.error('login failed', {
          error: error?.message ?? String(error),
          code: error?.code,
        })
        authDebug.error('login failed', {
          error: error?.message ?? String(error),
          code: error?.code,
          status: error?.status,
        })
        return {
          ok: false,
          message: `${SERVER_ERROR_MESSAGE} (${formatAuthError(error)})`,
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      location.search,
      login,
      mergeRemoteUserFigures,
      navigate,
      setSupabaseAuth,
    ],
  )

  const handleLogout = useCallback(async () => {
    try {
      await signOutSupabase()
    } catch (error) {
      authDebug.error('logout supabase signOut failed', {
        error: error?.message ?? String(error),
      })
    }

    logout()
    navigate(withQaParam('/login', isQaMode(location.search)), { replace: true })
  }, [location.search, logout, navigate])

  return {
    isAuthenticated,
    user,
    isSubmitting,
    login: handleLogin,
    logout: handleLogout,
  }
}
