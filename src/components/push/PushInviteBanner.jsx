import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import {
  getPushPermissionState,
  hasActivePushSubscription,
  isPushSupported,
  subscribeToPushNotifications,
} from '../../services/push/pushSubscription'

const DISMISS_KEY = 'album-push-invite-dismissed-v1'

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function writeDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // ignore
  }
}

export function PushInviteBanner() {
  const location = useLocation()
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)
  const authBootstrapped = useAppStore((state) => state.authBootstrapped)
  const [visible, setVisible] = useState(false)
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!authBootstrapped || !isAuthenticated) {
      setVisible(false)
      return
    }
    if (location.pathname.startsWith('/admin')) {
      setVisible(false)
      return
    }
    if (!isPushSupported()) {
      setVisible(false)
      return
    }
    if (readDismissed()) {
      setVisible(false)
      return
    }
    if (getPushPermissionState() !== 'default') {
      setVisible(false)
      return
    }

    let cancelled = false
    void hasActivePushSubscription().then((active) => {
      if (!cancelled && !active) {
        setVisible(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [authBootstrapped, isAuthenticated, location.pathname])

  const handleDismiss = useCallback(() => {
    writeDismissed()
    setVisible(false)
    setError(null)
  }, [])

  const handleActivate = useCallback(async () => {
    setActivating(true)
    setError(null)
    try {
      await subscribeToPushNotifications()
      writeDismissed()
      setVisible(false)
    } catch (activateError) {
      const code = activateError?.message ?? String(activateError)
      if (code === 'PERMISSION_DENIED') {
        writeDismissed()
        setVisible(false)
      } else {
        setError('No pudimos activar las notificaciones. Probá desde Opciones.')
      }
    } finally {
      setActivating(false)
    }
  }, [])

  if (!visible) return null

  return (
    <div className="safe-top pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[85] flex justify-center px-4">
      <div
        className="pointer-events-auto w-full max-w-md rounded-2xl border border-white/15 bg-zinc-900/95 p-4 shadow-lg backdrop-blur-sm"
        role="region"
        aria-label="Invitación a activar notificaciones"
      >
        <p className="text-sm font-medium leading-relaxed text-white/95">
          📢 Recibí avisos sobre nuevas figuritas, desafíos y colecciones.
        </p>
        {error && (
          <p className="mt-2 text-xs text-amber-200" role="alert">
            {error}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleActivate()}
            disabled={activating}
            className="rounded-xl bg-progress px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink disabled:opacity-60"
          >
            {activating ? 'Activando…' : 'Activar notificaciones'}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={activating}
            className="rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold text-white/90"
          >
            Más tarde
          </button>
        </div>
      </div>
    </div>
  )
}
