const TAG = '[session-debug]'

function emit(level, message, detail) {
  if (detail !== undefined) {
    if (level === 'error') console.error(TAG, message, detail)
    else console.info(TAG, message, detail)
  } else if (level === 'error') {
    console.error(TAG, message)
  } else {
    console.info(TAG, message)
  }
}

export const sessionDebug = {
  info: (message, detail) => emit('info', message, detail),
  error: (message, detail) => emit('error', message, detail),
}

export function getSupabaseAuthStorageKey(projectRef) {
  if (!projectRef) return null
  return `sb-${projectRef}-auth-token`
}

export function inspectSupabaseAuthStorage(projectRef) {
  if (typeof window === 'undefined' || !projectRef) {
    return { key: getSupabaseAuthStorageKey(projectRef), present: false, reason: 'no-window' }
  }

  const key = getSupabaseAuthStorageKey(projectRef)
  const raw = localStorage.getItem(key)

  if (!raw) {
    return { key, present: false }
  }

  try {
    const parsed = JSON.parse(raw)
    return {
      key,
      present: true,
      hasAccessToken: Boolean(parsed?.access_token),
      hasRefreshToken: Boolean(parsed?.refresh_token),
      expiresAt: parsed?.expires_at ?? null,
      userId: parsed?.user?.id ?? null,
      isAnonymous: parsed?.user?.is_anonymous ?? null,
      accessTokenPreview: parsed?.access_token
        ? `${String(parsed.access_token).slice(0, 12)}…`
        : null,
      refreshTokenPreview: parsed?.refresh_token
        ? `${String(parsed.refresh_token).slice(0, 12)}…`
        : null,
    }
  } catch (error) {
    return {
      key,
      present: true,
      parseError: true,
      message: error?.message ?? String(error),
    }
  }
}

export function summarizeSignInPayload(data) {
  if (!data) return null
  return {
    user: data.user
      ? {
          id: data.user.id,
          is_anonymous: data.user.is_anonymous,
          role: data.user.role,
        }
      : null,
    session: data.session
      ? {
          userId: data.session.user?.id ?? null,
          expires_at: data.session.expires_at ?? null,
          access_token: data.session.access_token ?? null,
          refresh_token: data.session.refresh_token ?? null,
          token_type: data.session.token_type ?? null,
        }
      : null,
  }
}

export function logSessionPhase(phase, detail) {
  sessionDebug.info(phase, detail)
}
