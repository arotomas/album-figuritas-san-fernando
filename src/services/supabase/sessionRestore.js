import { supabase } from '../../lib/supabase'
import { authRestoreLog } from '../../utils/authRestoreLog'

const INITIAL_SESSION_TIMEOUT_MS = 8000

function isSupabaseConfigured() {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
}

export function waitForInitialAuthSession() {
  if (!isSupabaseConfigured()) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    let finished = false

    const finish = (session, source) => {
      if (finished) return
      finished = true
      clearTimeout(timeoutId)
      subscription.unsubscribe()
      resolve(session?.user?.id ? { session, source } : null)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      authRestoreLog.info('auth state change', {
        event,
        userId: session?.user?.id ?? null,
      })

      if (event === 'INITIAL_SESSION') {
        finish(session, event)
      }
    })

    void supabase.auth.getSession().then(({ data, error }) => {
      if (finished) return

      if (error) {
        authRestoreLog.info('getSession error', { message: error.message })
        return
      }

      if (data.session?.user?.id) {
        window.setTimeout(() => {
          if (!finished) finish(data.session, 'GET_SESSION')
        }, 150)
      }
    })

    const timeoutId = window.setTimeout(() => {
      if (!finished) {
        authRestoreLog.info('initial session wait timeout')
        finish(null, 'TIMEOUT')
      }
    }, INITIAL_SESSION_TIMEOUT_MS)
  })
}

export async function resolveAuthenticatedUser(session) {
  const userResponse = await supabase.auth.getUser()

  if (!userResponse.error && userResponse.data.user?.id) {
    return {
      user: userResponse.data.user,
      session: (await supabase.auth.getSession()).data.session ?? session,
    }
  }

  authRestoreLog.info('getUser failed, attempting refresh', {
    message: userResponse.error?.message ?? null,
  })

  const refresh = await supabase.auth.refreshSession()
  if (!refresh.error && refresh.data.session?.user?.id) {
    return {
      user: refresh.data.session.user,
      session: refresh.data.session,
    }
  }

  if (session?.user?.id) {
    authRestoreLog.info('using stored session user after refresh failure', {
      message: refresh.error?.message ?? null,
    })
    return { user: session.user, session }
  }

  return null
}

export async function restoreSupabaseSession() {
  if (!isSupabaseConfigured()) return null

  const initial = await waitForInitialAuthSession()
  if (!initial?.session?.user?.id) return null

  authRestoreLog.info('session found', {
    userId: initial.session.user.id,
    source: initial.source,
  })

  const resolved = await resolveAuthenticatedUser(initial.session)
  if (!resolved?.user?.id) return null

  return {
    session: resolved.session,
    user: resolved.user,
  }
}

export async function hasStoredSupabaseSession() {
  if (!isSupabaseConfigured()) return false
  const { data } = await supabase.auth.getSession()
  return Boolean(data.session?.user?.id)
}
