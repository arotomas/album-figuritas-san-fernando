import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { isSupabaseConfigured } from '../../services/supabase/auth'
import {
  buildAuthDebugSnapshot,
  getSupabaseProjectRef,
  summarizeAuthResponse,
  summarizeSession,
} from '../../utils/authDebug'
import {
  inspectSupabaseAuthStorage,
  sessionDebug,
} from '../../utils/sessionDebug'
import { useAuthDebugStore } from '../../store/useAuthDebugStore'

export function AuthDebugPanel({ className = '' }) {
  const snapshot = useAuthDebugStore((state) => state.snapshot)
  const [live, setLive] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function refreshLiveState() {
      setLoading(true)
      const projectRef = getSupabaseProjectRef()
      const authStorage = inspectSupabaseAuthStorage(projectRef)

      try {
        const sessionResponse = await supabase.auth.getSession()
        const hasSession = Boolean(sessionResponse.data.session?.access_token)

        sessionDebug.info('debug panel live refresh — getSession', {
          hasSession,
          session: summarizeSession(sessionResponse.data.session),
          authStorage,
        })

        let userResponse = { data: { user: null }, error: null }
        if (hasSession) {
          userResponse = await supabase.auth.getUser()
          sessionDebug.info('debug panel live refresh — getUser', summarizeAuthResponse(userResponse))
        }

        if (cancelled) return

        setLive(
          buildAuthDebugSnapshot({
            liveSession: summarizeSession(sessionResponse.data.session),
            liveUser: userResponse.data.user
              ? {
                  id: userResponse.data.user.id,
                  is_anonymous: userResponse.data.user.is_anonymous,
                }
              : null,
            liveUserError: hasSession
              ? userResponse.error?.message ?? null
              : '(expected before login — no session yet)',
            liveSessionError: sessionResponse.error?.message ?? null,
            authStorage,
          }),
        )
      } catch (error) {
        if (!cancelled) {
          setLive(
            buildAuthDebugSnapshot({
              liveRefreshError: error?.message ?? String(error),
              authStorage,
            }),
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void refreshLiveState()
    const interval = setInterval(refreshLiveState, 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [snapshot?.updatedAt])

  const merged = {
    ...live,
    ...snapshot,
  }

  const authStorage = merged.authStorage ?? inspectSupabaseAuthStorage(getSupabaseProjectRef())

  return (
    <div
      className={`rounded-xl border border-amber-400/50 bg-amber-50 p-3 text-left font-mono text-[10px] leading-relaxed text-amber-950 ${className}`}
    >
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-900">
        Auth debug (temporal)
      </p>

      <dl className="space-y-1">
        <Row label="Supabase URL" value={merged.supabaseUrl ?? '(missing)'} />
        <Row label="Project ref" value={merged.projectRef ?? getSupabaseProjectRef() ?? '(unknown)'} />
        <Row label="URL configured" value={String(Boolean(merged.supabaseUrlConfigured))} />
        <Row label="Key configured" value={String(Boolean(merged.supabaseKeyConfigured))} />
        <Row label="Connection" value={merged.supabaseConnection ?? (isSupabaseConfigured() ? 'configured' : 'missing env')} />
        <Row label="Auth storage key" value={authStorage?.key ?? '(unknown)'} />
        <Row label="Storage present" value={String(Boolean(authStorage?.present))} />
        <Row label="Storage user id" value={authStorage?.userId ?? '(none)'} />
        <Row label="Access token" value={authStorage?.hasAccessToken ? authStorage.accessTokenPreview : '(none)'} />
        <Row label="Login status" value={merged.status ?? 'idle'} />
        <Row label="Auth status" value={merged.authStatus ?? (merged.liveUser?.id ? 'authenticated' : 'none')} />
        <Row label="Session status" value={merged.sessionStatus ?? (merged.liveSession?.userId ? 'active' : 'none')} />
        <Row label="User id" value={merged.userId ?? merged.liveUser?.id ?? merged.liveSession?.userId ?? '(none)'} />
        <Row label="Username" value={merged.profileUsername ?? merged.username ?? '(none)'} />
        <Row label="Profile id" value={merged.profileId ?? '(none)'} />
        <Row label="Step" value={merged.step ?? '(done)'} />
        <Row label="Live user error" value={merged.liveUserError ?? '(none)'} />
        <Row label="Live session error" value={merged.liveSessionError ?? '(none)'} />
        <Row label="Updated" value={merged.updatedAt ?? '(never)'} />
      </dl>

      {loading && <p className="mt-2 text-amber-800">Refreshing live auth state…</p>}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2">
      <dt className="text-amber-800">{label}</dt>
      <dd className="break-all text-amber-950">{String(value)}</dd>
    </div>
  )
}
