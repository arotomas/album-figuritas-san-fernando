import { useCallback, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { isQaMode, withQaParam } from '../utils/qaMode'
import {
  completeOAuthSession,
  formatAuthErrorMessage,
  isSupabaseConfigured,
  requestPasswordReset,
  signInWithEmailPassword,
  signInWithGoogle,
  signOutSupabase,
  signUpWithEmail,
  updatePassword,
} from '../services/supabase/auth'
import { completeUserProfile, updateProfileFields } from '../services/supabase/profile'
import { authLog } from '../utils/authLog'
import { useAuthNavigation } from './useAuthNavigation'

const SERVER_ERROR_MESSAGE = 'No pudimos conectar con el servidor. Probá de nuevo.'

export function useAuth() {
  const navigate = useNavigate()
  const location = useLocation()
  const logoutStore = useAppStore((state) => state.logout)
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)
  const user = useAppStore((state) => state.user)
  const profileCompleted = useAppStore((state) => state.profileCompleted)
  const supabaseProfile = useAppStore((state) => state.supabaseProfile)
  const supabaseUserId = useAppStore((state) => state.supabaseUserId)
  const setSupabaseAuth = useAppStore((state) => state.setSupabaseAuth)
  const isSupabaseAdmin = useAppStore((state) => state.isSupabaseAdmin)
  const loginStore = useAppStore((state) => state.login)
  const { finalizeAuth } = useAuthNavigation()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const guardConfigured = useCallback(() => {
    if (!isSupabaseConfigured()) {
      return `${SERVER_ERROR_MESSAGE} (Supabase no configurado en build)`
    }
    return null
  }, [])

  const register = useCallback(
    async ({ form, address }) => {
      const configError = guardConfigured()
      if (configError) return { ok: false, message: configError }

      setIsSubmitting(true)
      try {
        const result = await signUpWithEmail({
          email: form.email,
          password: form.password,
          profileInput: {
            nombre: form.nombre,
            apellido: form.apellido,
            dni: form.dni,
            celular: form.celular,
            username: form.username,
          },
          address,
        })

        await finalizeAuth(result)
        return { ok: true }
      } catch (error) {
        authLog.error('register failed', { message: error?.message })
        return { ok: false, message: formatAuthErrorMessage(error) }
      } finally {
        setIsSubmitting(false)
      }
    },
    [finalizeAuth, guardConfigured],
  )

  const signIn = useCallback(
    async ({ email, password }) => {
      const configError = guardConfigured()
      if (configError) return { ok: false, message: configError }

      setIsSubmitting(true)
      try {
        const result = await signInWithEmailPassword({ email, password })
        await finalizeAuth(result)
        return { ok: true }
      } catch (error) {
        authLog.error('signIn failed', { message: error?.message })
        return { ok: false, message: formatAuthErrorMessage(error) }
      } finally {
        setIsSubmitting(false)
      }
    },
    [finalizeAuth, guardConfigured],
  )

  const signInGoogle = useCallback(async () => {
    const configError = guardConfigured()
    if (configError) return { ok: false, message: configError }

    setIsSubmitting(true)
    try {
      await signInWithGoogle()
      return { ok: true, redirecting: true }
    } catch (error) {
      authLog.error('google signIn failed', { message: error?.message })
      return { ok: false, message: formatAuthErrorMessage(error) }
    } finally {
      setIsSubmitting(false)
    }
  }, [guardConfigured])

  const completeOAuthIfNeeded = useCallback(async () => {
    const configError = guardConfigured()
    if (configError) return { ok: false, message: configError }

    setIsSubmitting(true)
    try {
      const result = await completeOAuthSession()
      if (!result) return { ok: true, handled: false }

      await finalizeAuth(result)
      return { ok: true, handled: true }
    } catch (error) {
      authLog.error('oauth completion failed', { message: error?.message })
      return { ok: false, message: formatAuthErrorMessage(error) }
    } finally {
      setIsSubmitting(false)
    }
  }, [finalizeAuth, guardConfigured])

  const completeProfile = useCallback(
    async ({ form, address }) => {
      if (!supabaseUserId) {
        return { ok: false, message: 'No hay sesión activa.' }
      }

      setIsSubmitting(true)
      try {
        const profile = await completeUserProfile(
          supabaseUserId,
          {
            nombre: form.nombre,
            apellido: form.apellido,
            dni: form.dni,
            celular: form.celular,
            username: form.username,
            email: form.email || supabaseProfile?.email,
            auth_provider: supabaseProfile?.auth_provider ?? 'email',
          },
          address,
        )

        setSupabaseAuth({
          userId: supabaseUserId,
          isAdmin: isSupabaseAdmin,
          profile,
        })
        loginStore({
          username: profile.username,
          profileCompleted: true,
        })

        navigate(withQaParam('/map', isQaMode(location.search)), { replace: true })
        return { ok: true }
      } catch (error) {
        authLog.error('profile setup failed', { message: error?.message })
        return { ok: false, message: formatAuthErrorMessage(error) }
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      isSupabaseAdmin,
      location.search,
      loginStore,
      navigate,
      setSupabaseAuth,
      supabaseProfile,
      supabaseUserId,
    ],
  )

  const updateProfile = useCallback(
    async ({ form, address }) => {
      if (!supabaseUserId) {
        return { ok: false, message: 'No hay sesión activa.' }
      }

      setIsSubmitting(true)
      try {
        const profile = await updateProfileFields(
          supabaseUserId,
          {
            nombre: form.nombre,
            apellido: form.apellido,
            celular: form.celular,
            username: form.username,
            email: form.email || supabaseProfile?.email,
            dni: supabaseProfile?.dni,
            auth_provider: supabaseProfile?.auth_provider,
          },
          address,
        )

        setSupabaseAuth({
          userId: supabaseUserId,
          isAdmin: isSupabaseAdmin,
          profile,
        })

        return { ok: true, profile }
      } catch (error) {
        return { ok: false, message: formatAuthErrorMessage(error) }
      } finally {
        setIsSubmitting(false)
      }
    },
    [isSupabaseAdmin, setSupabaseAuth, supabaseProfile, supabaseUserId],
  )

  const forgotPassword = useCallback(async (email) => {
    const configError = guardConfigured()
    if (configError) return { ok: false, message: configError }

    setIsSubmitting(true)
    try {
      await requestPasswordReset(email)
      return { ok: true }
    } catch (error) {
      return { ok: false, message: formatAuthErrorMessage(error) }
    } finally {
      setIsSubmitting(false)
    }
  }, [guardConfigured])

  const resetPassword = useCallback(async (password) => {
    setIsSubmitting(true)
    try {
      await updatePassword(password)
      navigate(withQaParam('/login', isQaMode(location.search)), { replace: true })
      return { ok: true }
    } catch (error) {
      return { ok: false, message: formatAuthErrorMessage(error) }
    } finally {
      setIsSubmitting(false)
    }
  }, [location.search, navigate])

  const logout = useCallback(async () => {
    try {
      await signOutSupabase()
    } catch {
      // Local logout still proceeds.
    }
    logoutStore()
    navigate(withQaParam('/login', isQaMode(location.search)), { replace: true })
  }, [location.search, logoutStore, navigate])

  return {
    isAuthenticated,
    user,
    profileCompleted,
    supabaseProfile,
    isSubmitting,
    register,
    signIn,
    signInGoogle,
    completeOAuthIfNeeded,
    completeProfile,
    updateProfile,
    forgotPassword,
    resetPassword,
    logout,
  }
}
