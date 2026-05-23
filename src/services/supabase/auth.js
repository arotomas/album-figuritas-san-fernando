import { supabase } from '../../lib/supabase'
import { supabaseLog } from '../../utils/supabaseLog'
import { authLog, profileLog } from '../../utils/authLog'
import {
  authDebug,
  profileDebug,
  buildAuthDebugSnapshot,
  summarizeAuthResponse,
  summarizePostgrestResponse,
  summarizeSession,
  getSupabaseProjectRef,
} from '../../utils/authDebug'
import { useAuthDebugStore } from '../../store/useAuthDebugStore'

export function isSupabaseConfigured() {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
}

function publishDebugSnapshot(partial) {
  useAuthDebugStore.getState().setSnapshot(buildAuthDebugSnapshot(partial))
}

export async function getCurrentSession() {
  const response = await supabase.auth.getSession()
  authDebug.info('getSession response', summarizeAuthResponse(response))
  if (response.error) throw response.error
  return response.data.session
}

export async function getVerifiedUser() {
  const response = await supabase.auth.getUser()
  authDebug.info('getUser response', summarizeAuthResponse(response))
  if (response.error) throw response.error
  return response.data.user
}

export async function getCurrentUserId() {
  const user = await getVerifiedUser()
  return user?.id ?? null
}

async function signOutExistingSession() {
  authDebug.info('signOut start — clearing cached session before login')
  const { error } = await supabase.auth.signOut()
  if (error) {
    authDebug.error('signOut error', {
      message: error.message,
      code: error.code,
      status: error.status,
    })
    throw error
  }
  authDebug.info('signOut success')
}

async function signInAnonymouslyVerified() {
  authDebug.info('signInAnonymously start', {
    projectRef: getSupabaseProjectRef(),
    url: import.meta.env.VITE_SUPABASE_URL,
  })

  const signInResponse = await supabase.auth.signInAnonymously()
  authDebug.info('signInAnonymously response', summarizeAuthResponse(signInResponse))

  if (signInResponse.error) {
    authLog.error('signInAnonymously error', { error: signInResponse.error.message })
    throw signInResponse.error
  }

  const session = signInResponse.data.session
  const user = signInResponse.data.user

  if (!user?.id) {
    const err = new Error('AUTH_NO_USER')
    authLog.error('signInAnonymously error', { error: err.message })
    throw err
  }

  if (!session?.access_token) {
    const err = new Error('AUTH_NO_ACCESS_TOKEN')
    authLog.error('signInAnonymously error', { error: err.message })
    throw err
  }

  const verifiedUser = await getVerifiedUser()
  if (!verifiedUser?.id) {
    const err = new Error('AUTH_VERIFICATION_FAILED_NO_USER')
    authDebug.error('getUser verification failed', { verifiedUser })
    throw err
  }

  if (verifiedUser.id !== user.id) {
    const err = new Error('AUTH_VERIFICATION_USER_MISMATCH')
    authDebug.error('getUser mismatch', {
      signInUserId: user.id,
      verifiedUserId: verifiedUser.id,
    })
    throw err
  }

  authLog.info('signInAnonymously success', { userId: user.id })
  authDebug.info('signInAnonymously verified', {
    userId: user.id,
    isAnonymous: verifiedUser.is_anonymous,
    session: summarizeSession(session),
  })

  return { session, user: verifiedUser }
}

async function upsertAndVerifyProfile(userId, username) {
  const trimmed = username?.trim()
  if (!userId || !trimmed) {
    throw new Error('USERNAME_REQUIRED')
  }

  profileLog.info('upsert start', { userId, username: trimmed })
  profileDebug.info('upsert start', { userId, username: trimmed })

  const upsertResponse = await supabase
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

  profileDebug.info('upsert response', summarizePostgrestResponse(upsertResponse))

  if (upsertResponse.error) {
    profileLog.error('upsert error', {
      message: upsertResponse.error.message,
      code: upsertResponse.error.code,
      details: upsertResponse.error.details,
      hint: upsertResponse.error.hint,
    })
    throw upsertResponse.error
  }

  if (!upsertResponse.data?.id) {
    const err = new Error('PROFILE_UPSERT_EMPTY')
    profileDebug.error('upsert returned empty data', upsertResponse)
    throw err
  }

  const readResponse = await supabase
    .from('profiles')
    .select('id, username, avatar_url, is_admin, created_at')
    .eq('id', userId)
    .single()

  profileDebug.info('read-back response', summarizePostgrestResponse(readResponse))

  if (readResponse.error || !readResponse.data?.id) {
    const err = new Error('PROFILE_READBACK_FAILED')
    profileDebug.error('profile read-back failed', summarizePostgrestResponse(readResponse))
    throw err
  }

  if (readResponse.data.username !== trimmed) {
    const err = new Error('PROFILE_READBACK_MISMATCH')
    profileDebug.error('profile username mismatch', {
      expected: trimmed,
      actual: readResponse.data.username,
    })
    throw err
  }

  profileLog.info('upsert success', { userId, username: readResponse.data.username })
  profileDebug.info('upsert verified', readResponse.data)
  return readResponse.data
}

export async function ensureProfile(userId, username) {
  return upsertAndVerifyProfile(userId, username)
}

export async function ensureAnonymousSession() {
  if (!isSupabaseConfigured()) {
    supabaseLog.auth.warn('skipped — missing env vars')
    return null
  }

  const session = await getCurrentSession()
  if (session?.user?.id) {
    try {
      const verifiedUser = await getVerifiedUser()
      if (verifiedUser?.id === session.user.id) {
        supabaseLog.auth.info('session restored', { userId: verifiedUser.id })
        return { session, profile: null, user: verifiedUser }
      }
    } catch (error) {
      authDebug.error('stored session failed verification', {
        error: error?.message ?? String(error),
      })
    }
  }

  const { session: freshSession, user } = await signInAnonymouslyVerified()
  return { session: freshSession, profile: null, user }
}

export async function fetchProfile(userId) {
  const response = await supabase
    .from('profiles')
    .select('id, username, avatar_url, is_admin, created_at')
    .eq('id', userId)
    .maybeSingle()

  profileDebug.info('fetchProfile response', summarizePostgrestResponse(response))
  if (response.error) throw response.error
  return response.data
}

/**
 * Login obligatorio con verificación server-side real.
 * Nunca reutiliza sesión cacheada: signOut → signInAnonymously → getUser → profile read-back.
 */
export async function loginWithUsername(username) {
  const trimmed = username?.trim()
  if (!trimmed) {
    throw new Error('USERNAME_REQUIRED')
  }

  if (!isSupabaseConfigured()) {
    authLog.error('login blocked — missing env vars')
    publishDebugSnapshot({
      status: 'blocked',
      reason: 'SUPABASE_NOT_CONFIGURED',
    })
    throw new Error('SUPABASE_NOT_CONFIGURED')
  }

  authLog.info('login submit', { username: trimmed })
  authDebug.info('login submit', {
    username: trimmed,
    projectRef: getSupabaseProjectRef(),
  })

  publishDebugSnapshot({
    status: 'in_progress',
    username: trimmed,
    step: 'signOut',
  })

  await signOutExistingSession()

  publishDebugSnapshot({
    status: 'in_progress',
    username: trimmed,
    step: 'signInAnonymously',
  })

  const { session, user } = await signInAnonymouslyVerified()

  publishDebugSnapshot({
    status: 'in_progress',
    username: trimmed,
    step: 'profileUpsert',
    userId: user.id,
    session: summarizeSession(session),
    authStatus: 'authenticated',
  })

  const profile = await upsertAndVerifyProfile(user.id, trimmed)

  if (!session?.user?.id || !profile?.id) {
    const err = new Error('AUTH_INCOMPLETE')
    authLog.error('login incomplete', {
      hasSession: Boolean(session?.user?.id),
      hasProfile: Boolean(profile?.id),
    })
    throw err
  }

  const finalSnapshot = buildAuthDebugSnapshot({
    status: 'success',
    username: trimmed,
    userId: user.id,
    profileId: profile.id,
    profileUsername: profile.username,
    authStatus: 'authenticated',
    sessionStatus: 'active',
    session: summarizeSession(session),
    supabaseConnection: 'ok',
  })

  publishDebugSnapshot(finalSnapshot)
  supabaseLog.auth.info('login complete', { userId: user.id, username: trimmed })
  authDebug.info('login complete verified', finalSnapshot)

  return {
    userId: user.id,
    profile,
    session,
    user,
  }
}

export async function signOutSupabase() {
  authDebug.info('signOut requested')
  const { error } = await supabase.auth.signOut()
  if (error) {
    authDebug.error('signOut error', { message: error.message })
    throw error
  }
  useAuthDebugStore.getState().clearSnapshot()
  authDebug.info('signOut success')
}
