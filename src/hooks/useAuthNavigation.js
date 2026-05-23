import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { isAdmin } from '../services/supabase/admin'
import { pullRemoteAlbum } from '../services/supabase/sync'
import { publishAuthSuccessSnapshot } from '../services/supabase/auth'
import { isProfileComplete } from '../utils/profileValidation'
import { isQaMode, withQaParam } from '../utils/qaMode'

export function useAuthNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAppStore((state) => state.login)
  const setSupabaseAuth = useAppStore((state) => state.setSupabaseAuth)
  const mergeRemoteUserFigures = useAppStore((state) => state.mergeRemoteUserFigures)

  const finalizeAuth = useCallback(
    async ({ userId, user, session, profile }) => {
      const admin = await isAdmin(userId)
      setSupabaseAuth({ userId, isAdmin: admin, profile })

      try {
        const remoteRows = await pullRemoteAlbum()
        if (remoteRows.length > 0) {
          mergeRemoteUserFigures(remoteRows)
        }
      } catch {
        // Album sync failure should not block auth.
      }

      const completed = isProfileComplete(profile)
      login({
        username: profile?.username ?? user?.email ?? 'explorador',
        profileCompleted: completed,
      })

      publishAuthSuccessSnapshot({
        userId,
        profile,
        session,
        email: user?.email ?? profile?.email ?? null,
      })

      const nextPath = completed
        ? withQaParam('/map', isQaMode(location.search))
        : withQaParam('/profile-setup', isQaMode(location.search))

      navigate(nextPath, { replace: true })
      return { completed, profile }
    },
    [location.search, login, mergeRemoteUserFigures, navigate, setSupabaseAuth],
  )

  return { finalizeAuth }
}
