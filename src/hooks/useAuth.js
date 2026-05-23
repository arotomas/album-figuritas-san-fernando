import { useCallback, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { isQaMode, withQaParam } from '../utils/qaMode'
import { isSupabaseConfigured, loginWithUsername } from '../services/supabase/auth'
import { isAdmin } from '../services/supabase/admin'
import { pullRemoteAlbum } from '../services/supabase/sync'
import { supabaseLog } from '../utils/supabaseLog'

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
    async ({ username }) => {
      const trimmed = username?.trim()
      if (!trimmed) return false

      setIsSubmitting(true)

      try {
        if (isSupabaseConfigured()) {
          try {
            const { userId } = await loginWithUsername(trimmed)
            const admin = await isAdmin(userId)
            setSupabaseAuth({ userId, isAdmin: admin })

            const remoteRows = await pullRemoteAlbum()
            if (remoteRows.length > 0) {
              mergeRemoteUserFigures(remoteRows)
            }
          } catch (error) {
            supabaseLog.auth.warn('login remote sync failed — continuing locally', {
              message: error?.message ?? String(error),
            })
          }
        }

        login({ username: trimmed })
        navigate(withQaParam('/map', isQaMode(location.search)), { replace: true })
        return true
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

  const handleLogout = useCallback(() => {
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
