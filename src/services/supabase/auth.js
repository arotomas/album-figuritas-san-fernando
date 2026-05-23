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
import {
  sessionDebug,
  inspectSupabaseAuthStorage,
  summarizeSignInPayload,
  logSessionPhase,
} from '../../utils/sessionDebug'
import { useAuthDebugStore } from '../../store/useAuthDebugStore'

export function isSupabaseConfigured() {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
}

function publishDebugSnapshot(partial) {
  useAuthDebugStore.getState().setSnapshot(
    buildAuthDebugSnapshot({
      authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
      ...partial,
    }),
  )
}

export async function getCurrentSession() {
  const response = await supabase.auth.getSession()
  sessionDebug.info('getSession response', summarizeAuthResponse(response))
  if (response.error) throw response.error
  return response.data.session
}

export async function getVerifiedUser() {
  const session = await getCurrentSession()
  if (!session?.access_token) {
    const err = new Error('Auth session missing!')
    sessionDebug.error('getUser blocked — no session in storage', {
      authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
    })
    throw err
  }

  const response = await supabase.auth.getUser()
  authDebug.info('getUser response', summarizeAuthResponse(response))
  if (response.error) throw response.error
  return response.data.user
}

export async function getCurrentUserId() {
  const user = await getVerifiedUser()
  return user?.id ?? null
}

/** ID desde sesión local — para storage/sync sin round-trip extra. */
export async function getSessionUserId() {
  const response = await supabase.auth.getSession()
  if (response.error) {
    sessionDebug.error('getSessionUserId failed', { message: response.error.message })
    return null
  }
  return response.data.session?.user?.id ?? null
}

async function clearLocalAuthSession() {
  logSessionPhase('before login — signOut local scope')
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) {
    sessionDebug.error('signOut local failed', { message: error.message })
    throw error
  }
  sessionDebug.info('signOut local success', {
    authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
  })
}

async function verifyPersistedSession(expectedUserId, phase) {
  logSessionPhase(`${phase} — getSession verify`)

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  sessionDebug.info(`${phase} — getSession result`, {
    error: sessionError?.message ?? null,
    session: summarizeSession(sessionData?.session ?? null),
    authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
  })

  if (sessionError) {
    throw sessionError
  }

  if (!sessionData?.session?.access_token) {
    const err = new Error('SESSION_NOT_PERSISTED')
    sessionDebug.error(`${phase} — session missing after auth`, {
      authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
    })
    throw err
  }

  const storage = inspectSupabaseAuthStorage(getSupabaseProjectRef())
  if (!storage.present || !storage.hasAccessToken) {
    const err = new Error('SESSION_STORAGE_MISSING')
    sessionDebug.error(`${phase} — localStorage auth token missing`, { storage })
    throw err
  }

  if (expectedUserId && sessionData.session.user?.id !== expectedUserId) {
    const err = new Error('SESSION_USER_MISMATCH')
    sessionDebug.error(`${phase} — session user mismatch`, {
      expectedUserId,
      actualUserId: sessionData.session.user?.id ?? null,
    })
    throw err
  }

  return sessionData.session
}

async function signInAnonymouslyVerified() {
  const projectRef = getSupabaseProjectRef()

  logSessionPhase('before signInAnonymously', {
    projectRef,
    authStorage: inspectSupabaseAuthStorage(projectRef),
  })

  authDebug.info('signInAnonymously start', {
    projectRef,
    url: import.meta.env.VITE_SUPABASE_URL,
  })

  const signInResponse = await supabase.auth.signInAnonymously()

  sessionDebug.info('after signInAnonymously — raw response', {
    error: signInResponse.error
      ? {
          message: signInResponse.error.message,
          status: signInResponse.error.status,
          code: signInResponse.error.code,
        }
      : null,
    data: summarizeSignInPayload(signInResponse.data),
  })

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

  if (!session?.access_token || !session?.refresh_token) {
    const err = new Error('AUTH_NO_ACCESS_TOKEN')
    authLog.error('signInAnonymously error', { error: err.message })
    throw err
  }

  logSessionPhase('after signIn — setSession explicit')
  const setSessionResponse = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })

  sessionDebug.info('after setSession', {
    error: setSessionResponse.error?.message ?? null,
    session: summarizeSession(setSessionResponse.data.session),
    authStorage: inspectSupabaseAuthStorage(projectRef),
  })

  if (setSessionResponse.error) {
    throw setSessionResponse.error
  }

  const persistedSession = await verifyPersistedSession(user.id, 'after setSession')

  logSessionPhase('after signIn — getUser server verify')
  const userResponse = await supabase.auth.getUser()

  sessionDebug.info('after getUser', summarizeAuthResponse(userResponse))

  if (userResponse.error || !userResponse.data.user?.id) {
    const err = new Error('AUTH_VERIFICATION_FAILED_NO_USER')
    authDebug.error('getUser verification failed', summarizeAuthResponse(userResponse))
    throw err
  }

  if (userResponse.data.user.id !== user.id) {
    const err = new Error('AUTH_VERIFICATION_USER_MISMATCH')
    authDebug.error('getUser mismatch', {
      signInUserId: user.id,
      verifiedUserId: userResponse.data.user.id,
    })
    throw err
  }

  authLog.info('signInAnonymously success', { userId: user.id })
  authDebug.info('signInAnonymously verified', {
    userId: user.id,
    isAnonymous: userResponse.data.user.is_anonymous,
    session: summarizeSession(persistedSession),
    authStorage: inspectSupabaseAuthStorage(projectRef),
  })

  return { session: persistedSession, user: userResponse.data.user }
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

/** Restaura sesión persistida — NO crea usuarios nuevos. */
export async function restoreSupabaseSession() {
  if (!isSupabaseConfigured()) return null

  sessionDebug.info('restore session — start', {
    authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
  })

  const session = await verifyPersistedSession(null, 'restore').catch((error) => {
    sessionDebug.error('restore session — no valid persisted session', {
      message: error?.message ?? String(error),
    })
    return null
  })

  if (!session) return null

  const userResponse = await supabase.auth.getUser()
  if (userResponse.error || !userResponse.data.user?.id) {
    sessionDebug.error('restore session — getUser failed', summarizeAuthResponse(userResponse))
    return null
  }

  sessionDebug.info('restore session — success', {
    userId: userResponse.data.user.id,
    authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
  })

  return {
    session,
    user: userResponse.data.user,
  }
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

  logSessionPhase('login flow start', {
    username: trimmed,
    authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
  })

  publishDebugSnapshot({
    status: 'in_progress',
    username: trimmed,
    step: 'signOutLocal',
  })

  await clearLocalAuthSession()

  publishDebugSnapshot({
    status: 'in_progress',
    username: trimmed,
    step: 'signInAnonymously',
  })

  const { session, user } = await signInAnonymouslyVerified()

  await verifyPersistedSession(user.id, 'before profile upsert')

  publishDebugSnapshot({
    status: 'in_progress',
    username: trimmed,
    step: 'profileUpsert',
    userId: user.id,
    session: summarizeSession(session),
    authStatus: 'authenticated',
    sessionStatus: 'active',
  })

  const profile = await upsertAndVerifyProfile(user.id, trimmed)

  const finalSession = await verifyPersistedSession(user.id, 'before login complete')

  if (!finalSession?.user?.id || !profile?.id) {
    const err = new Error('AUTH_INCOMPLETE')
    authLog.error('login incomplete', {
      hasSession: Boolean(finalSession?.user?.id),
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
    session: summarizeSession(finalSession),
    authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
    supabaseConnection: 'ok',
  })

  publishDebugSnapshot(finalSnapshot)
  supabaseLog.auth.info('login complete', { userId: user.id, username: trimmed })
  authDebug.info('login complete verified', finalSnapshot)
  sessionDebug.info('login flow complete — session persisted', {
    userId: user.id,
    authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
  })

  return {
    userId: user.id,
    profile,
    session: finalSession,
    user,
  }
}

export async function signOutSupabase() {
  authDebug.info('signOut requested')
  sessionDebug.info('signOut requested')
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) {
    authDebug.error('signOut error', { message: error.message })
    throw error
  }
  useAuthDebugStore.getState().clearSnapshot()
  authDebug.info('signOut success')
  sessionDebug.info('signOut success', {
    authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
  })
}
