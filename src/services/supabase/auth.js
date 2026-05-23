import { supabase } from '../../lib/supabase'
import { supabaseLog } from '../../utils/supabaseLog'
import { authLog, profileLog } from '../../utils/authLog'

export function isSupabaseConfigured() {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function getCurrentUserId() {
  const session = await getCurrentSession()
  return session?.user?.id ?? null
}

/**
 * Crea o actualiza profile con username. Falla con error real de RLS/red.
 */
export async function ensureProfile(userId, username) {
  const trimmed = username?.trim()
  if (!userId || !trimmed) {
    throw new Error('USERNAME_REQUIRED')
  }

  profileLog.info('upsert start', { userId, username: trimmed })

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        username: trimmed,
        is_admin: false,
      },
      { onConflict: 'id' },
    )
    .select('id, username, avatar_url, is_admin, created_at')
    .single()

  if (error) {
    profileLog.error('upsert error', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    throw error
  }

  profileLog.info('upsert success', { userId, username: data.username })
  return data
}

export async function ensureAnonymousSession() {
  if (!isSupabaseConfigured()) {
    supabaseLog.auth.warn('skipped — missing env vars')
    return null
  }

  const existing = await getCurrentSession()
  if (existing?.user) {
    supabaseLog.auth.info('session restored', { userId: existing.user.id })
    return { session: existing, profile: null }
  }

  authLog.info('signInAnonymously start')
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    authLog.error('signInAnonymously error', { error: error.message })
    throw error
  }

  const userId = data.user?.id ?? data.session?.user?.id
  if (!userId) {
    authLog.error('signInAnonymously error', { error: 'AUTH_NO_USER' })
    throw new Error('AUTH_NO_USER')
  }

  authLog.info('signInAnonymously success', { userId })
  return { session: data.session, profile: null }
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, is_admin, created_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Login obligatorio: signInAnonymously + profile upsert.
 * No resuelve si falta session.user.id o profile.
 */
export async function loginWithUsername(username) {
  const trimmed = username?.trim()
  if (!trimmed) {
    throw new Error('USERNAME_REQUIRED')
  }

  if (!isSupabaseConfigured()) {
    authLog.error('login blocked — missing env vars')
    throw new Error('SUPABASE_NOT_CONFIGURED')
  }

  authLog.info('login submit', { username: trimmed })

  let session = await getCurrentSession()
  let userId = session?.user?.id ?? null

  if (!userId) {
    authLog.info('signInAnonymously start')
    const { data, error } = await supabase.auth.signInAnonymously()

    if (error) {
      authLog.error('signInAnonymously error', { error: error.message })
      throw error
    }

    session = data.session
    userId = data.user?.id ?? data.session?.user?.id

    if (!userId) {
      authLog.error('signInAnonymously error', { error: 'AUTH_NO_USER' })
      throw new Error('AUTH_NO_USER')
    }

    authLog.info('signInAnonymously success', { userId })
  } else {
    authLog.info('signInAnonymously skipped — existing session', { userId })
  }

  const profile = await ensureProfile(userId, trimmed)

  if (!session?.user?.id || !profile?.id) {
    authLog.error('login incomplete', {
      hasSession: Boolean(session?.user?.id),
      hasProfile: Boolean(profile?.id),
    })
    throw new Error('AUTH_INCOMPLETE')
  }

  supabaseLog.auth.info('login complete', { userId, username: trimmed })
  return {
    userId,
    profile,
    session,
  }
}
