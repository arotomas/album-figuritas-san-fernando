const AUTH_TAG = '[auth-debug]'
const PROFILE_TAG = '[profile-debug]'

function emit(tag, level, message, detail) {
  const prefix = tag === 'profile' ? PROFILE_TAG : AUTH_TAG
  if (detail !== undefined) {
    if (level === 'error') console.error(prefix, message, detail)
    else console.info(prefix, message, detail)
  } else if (level === 'error') {
    console.error(prefix, message)
  } else {
    console.info(prefix, message)
  }
}

export const authDebug = {
  info: (message, detail) => emit('auth', 'info', message, detail),
  error: (message, detail) => emit('auth', 'error', message, detail),
}

export const profileDebug = {
  info: (message, detail) => emit('profile', 'info', message, detail),
  error: (message, detail) => emit('profile', 'error', message, detail),
}

export function getSupabaseProjectRef(url = import.meta.env.VITE_SUPABASE_URL) {
  if (!url) return null
  try {
    return new URL(url).hostname.split('.')[0] ?? null
  } catch {
    return null
  }
}

export function summarizeSession(session) {
  if (!session) return null
  return {
    userId: session.user?.id ?? null,
    email: session.user?.email ?? null,
    isAnonymous: session.user?.is_anonymous ?? null,
    expiresAt: session.expires_at ?? null,
    accessTokenLength: session.access_token?.length ?? 0,
    refreshTokenLength: session.refresh_token?.length ?? 0,
  }
}

export function summarizeAuthResponse(response) {
  return {
    error: response?.error
      ? {
          message: response.error.message,
          name: response.error.name,
          status: response.error.status,
          code: response.error.code,
        }
      : null,
    user: response?.data?.user
      ? {
          id: response.data.user.id,
          is_anonymous: response.data.user.is_anonymous,
          role: response.data.user.role,
        }
      : null,
    session: summarizeSession(response?.data?.session),
  }
}

export function summarizePostgrestResponse(response) {
  return {
    error: response?.error
      ? {
          message: response.error.message,
          code: response.error.code,
          details: response.error.details,
          hint: response.error.hint,
        }
      : null,
    data: response?.data ?? null,
    count: Array.isArray(response?.data) ? response.data.length : response?.data ? 1 : 0,
  }
}

export function buildAuthDebugSnapshot(partial = {}) {
  return {
    updatedAt: new Date().toISOString(),
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? null,
    supabaseUrlConfigured: Boolean(import.meta.env.VITE_SUPABASE_URL),
    supabaseKeyConfigured: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY),
    projectRef: getSupabaseProjectRef(),
    ...partial,
  }
}
