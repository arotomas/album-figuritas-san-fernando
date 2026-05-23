import { supabase } from '../../lib/supabase'
import { supabaseLog } from '../../utils/supabaseLog'

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

export async function ensureAnonymousSession() {
  if (!isSupabaseConfigured()) {
    supabaseLog.auth.warn('skipped — missing env vars')
    return null
  }

  const existing = await getCurrentSession()
  if (existing?.user) {
    supabaseLog.auth.info('session restored', { userId: existing.user.id })
    const profile = await ensureProfile(existing.user.id)
    return { session: existing, profile }
  }

  supabaseLog.auth.info('signing in anonymously')
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    supabaseLog.auth.warn('anonymous sign-in failed', { message: error.message })
    throw error
  }

  const userId = data.user?.id ?? data.session?.user?.id
  if (!userId) {
    throw new Error('AUTH_NO_USER')
  }

  supabaseLog.auth.info('anonymous session created', { userId })
  const profile = await ensureProfile(userId)
  return { session: data.session, profile }
}

export async function ensureProfile(userId) {
  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, is_admin, created_at')
    .eq('id', userId)
    .maybeSingle()

  if (readError) {
    supabaseLog.auth.warn('profile read failed', { message: readError.message })
    throw readError
  }

  if (existing) {
    supabaseLog.auth.info('profile loaded', { userId, isAdmin: existing.is_admin })
    return existing
  }

  const username = `explorador-${userId.slice(0, 8)}`
  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      username,
      is_admin: false,
    })
    .select('id, username, avatar_url, is_admin, created_at')
    .single()

  if (insertError) {
    supabaseLog.auth.warn('profile create failed', { message: insertError.message })
    throw insertError
  }

  supabaseLog.auth.info('profile created', { userId, username })
  return created
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

export async function updateProfileUsername(userId, username) {
  const trimmed = username?.trim()
  if (!userId || !trimmed) {
    throw new Error('USERNAME_REQUIRED')
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        username: trimmed,
      },
      { onConflict: 'id' },
    )
    .select('id, username, avatar_url, is_admin, created_at')
    .single()

  if (error) {
    supabaseLog.auth.warn('profile username update failed', { message: error.message })
    throw error
  }

  supabaseLog.auth.info('profile username updated', { userId, username: trimmed })
  return data
}

/**
 * Login v1: sesión anónima + username en profile.
 */
export async function loginWithUsername(username) {
  const trimmed = username?.trim()
  if (!trimmed) {
    throw new Error('USERNAME_REQUIRED')
  }

  const sessionResult = await ensureAnonymousSession()
  if (!sessionResult?.session?.user?.id) {
    throw new Error('AUTH_FAILED')
  }

  const userId = sessionResult.session.user.id
  const profile = await updateProfileUsername(userId, trimmed)

  supabaseLog.auth.info('login complete', { userId, username: trimmed })
  return {
    userId,
    profile,
    session: sessionResult.session,
  }
}
