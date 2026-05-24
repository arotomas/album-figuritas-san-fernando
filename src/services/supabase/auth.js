import { supabase } from '../../lib/supabase'
import { supabaseLog } from '../../utils/supabaseLog'
import { authLog } from '../../utils/authLog'
import {
  ensureProfileFromAuthUser,
  fetchProfileById,
  touchProfileLogin,
  upsertUserProfile,
} from './profile'

export { restoreSupabaseSession, hasStoredSupabaseSession } from './sessionRestore'

export function isSupabaseConfigured() {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
}

export function formatAuthErrorMessage(error) {
  const message = error?.message ?? ''
  const code = error?.code ?? ''

  if (message === 'USERNAME_TAKEN') {
    return 'Ese username ya está en uso. Probá con otro apodo.'
  }
  if (message === 'EMAIL_CONFIRMATION_REQUIRED') {
    return 'Te enviamos un email para confirmar la cuenta. Revisá tu bandeja.'
  }
  if (message === 'PROFILE_COLUMNS_MISSING') {
    return 'Faltan columnas de perfil en Supabase. Aplicá las migrations 010 y 011.'
  }
  if (/invalid login credentials/i.test(message)) {
    return 'Email o contraseña incorrectos.'
  }
  if (/user already registered/i.test(message)) {
    return 'Ya existe una cuenta con ese email.'
  }
  if (/email not confirmed/i.test(message)) {
    return 'Confirmá tu email antes de ingresar.'
  }
  if (/password should be at least/i.test(message)) {
    return 'La contraseña debe tener al menos 8 caracteres.'
  }

  return [message, code].filter(Boolean).join(' · ') || 'No pudimos completar la autenticación.'
}

export async function getCurrentSession() {
  const response = await supabase.auth.getSession()
  if (response.error) throw response.error
  return response.data.session
}

export async function getVerifiedUser() {
  const session = await getCurrentSession()
  if (!session?.access_token) {
    throw new Error('Auth session missing!')
  }

  const response = await supabase.auth.getUser()
  if (response.error) throw response.error
  return response.data.user
}

export async function getCurrentUserId() {
  const user = await getVerifiedUser()
  return user?.id ?? null
}

export async function getSessionUserId() {
  const response = await supabase.auth.getSession()
  if (response.error) return null
  return response.data.session?.user?.id ?? null
}

async function clearLocalAuthSession() {
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) throw error
}

export async function fetchProfile(userId) {
  return fetchProfileById(userId)
}

export async function signUpWithEmail({ email, password, profileInput, address }) {
  authLog.info('signUp start', { email })

  await clearLocalAuthSession()

  const signUpResponse = await supabase.auth.signUp({ email, password })
  if (signUpResponse.error) throw signUpResponse.error

  const authUser = signUpResponse.data.user
  if (!authUser?.id) throw new Error('SIGNUP_NO_USER')

  if (!signUpResponse.data.session) {
    throw new Error('EMAIL_CONFIRMATION_REQUIRED')
  }

  const profile = await upsertUserProfile(
    authUser.id,
    {
      ...profileInput,
      email,
      auth_provider: 'email',
    },
    address,
  )

  await touchProfileLogin(authUser.id)

  authLog.info('signUp success', { userId: authUser.id })
  return {
    userId: authUser.id,
    user: authUser,
    session: signUpResponse.data.session,
    profile,
  }
}

export async function signInWithEmailPassword({ email, password }) {
  authLog.info('signIn email start', { email })

  await clearLocalAuthSession()

  const signInResponse = await supabase.auth.signInWithPassword({ email, password })
  if (signInResponse.error) throw signInResponse.error

  const authUser = signInResponse.data.user
  const session = signInResponse.data.session
  if (!authUser?.id || !session) throw new Error('AUTH_INCOMPLETE')

  if (authUser.is_anonymous) {
    throw new Error('ANONYMOUS_LOGIN_DISABLED')
  }

  let profile = await fetchProfileById(authUser.id)
  if (!profile?.id) {
    profile = await ensureProfileFromAuthUser(authUser, 'email')
  }

  await touchProfileLogin(authUser.id)

  authLog.info('signIn email success', { userId: authUser.id })
  return { userId: authUser.id, user: authUser, session, profile }
}

export async function signInWithGoogle() {
  authLog.info('signIn google start')

  const redirectTo = `${window.location.origin}/login`
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })

  if (error) throw error
}

export async function completeOAuthSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!data.session?.user?.id) return null

  const authUser = data.session.user
  if (authUser.is_anonymous) {
    await signOutSupabase()
    return null
  }

  let profile = await fetchProfileById(authUser.id)
  if (!profile?.id) {
    profile = await ensureProfileFromAuthUser(authUser, 'google')
  }

  await touchProfileLogin(authUser.id)

  authLog.info('oauth session ready', { userId: authUser.id })
  return {
    userId: authUser.id,
    user: authUser,
    session: data.session,
    profile,
  }
}

export async function requestPasswordReset(email) {
  authLog.info('password reset request', { email })
  const redirectTo = `${window.location.origin}/reset-password`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

export async function updatePassword(nextPassword) {
  authLog.info('password update start')
  const { data, error } = await supabase.auth.updateUser({ password: nextPassword })
  if (error) throw error
  authLog.info('password update success')
  return data.user
}

export async function signOutSupabase() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export function publishAuthSuccessSnapshot({ userId, profile, email }) {
  supabaseLog.auth.info('auth complete', {
    userId,
    email: email ?? profile?.email ?? null,
  })
}
