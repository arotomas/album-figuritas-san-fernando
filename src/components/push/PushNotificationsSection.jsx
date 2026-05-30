import { useCallback, useEffect, useState } from 'react'
import {
  deactivateCurrentPushSubscription,
  getPushPermissionState,
  hasActivePushSubscription,
  isPushSupported,
  subscribeToPushNotifications,
} from '../../services/push/pushSubscription'

export function PushNotificationsSection() {
  const supported = isPushSupported()
  const [permission, setPermission] = useState(() => getPushPermissionState())
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const refreshState = useCallback(async () => {
    setLoading(true)
    setPermission(getPushPermissionState())
    if (!supported) {
      setSubscribed(false)
      setLoading(false)
      return
    }
    const active = await hasActivePushSubscription()
    setSubscribed(active)
    setLoading(false)
  }, [supported])

  useEffect(() => {
    void refreshState()
  }, [refreshState])

  const handleEnable = async () => {
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      await subscribeToPushNotifications()
      setPermission(getPushPermissionState())
      setSubscribed(true)
      setMessage('Notificaciones activadas en este dispositivo.')
    } catch (enableError) {
      const code = enableError?.message ?? String(enableError)
      if (code === 'PERMISSION_DENIED') {
        setError('Permiso denegado. Podés habilitarlo desde la configuración del navegador.')
      } else if (code === 'PUSH_NOT_SUPPORTED') {
        setError('Este navegador no soporta notificaciones push.')
      } else {
        setError('No pudimos activar las notificaciones.')
      }
      await refreshState()
    } finally {
      setBusy(false)
    }
  }

  const handleDisable = async () => {
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      await deactivateCurrentPushSubscription()
      setSubscribed(false)
      setMessage('Notificaciones desactivadas en este dispositivo.')
    } catch {
      setError('No pudimos desactivar las notificaciones.')
    } finally {
      setBusy(false)
      await refreshState()
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="font-display text-lg font-bold text-ink">Notificaciones push</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Recibí avisos sobre nuevas figuritas, desafíos y colecciones.
      </p>

      {!supported && (
        <p className="mt-3 text-sm text-amber-700">
          No disponible en este navegador. En iPhone, instalá la app en la pantalla de inicio.
        </p>
      )}

      {supported && !loading && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted">
            Estado:{' '}
            {permission === 'granted' && subscribed
              ? 'Activadas'
              : permission === 'denied'
                ? 'Bloqueadas en el navegador'
                : 'Sin activar'}
          </p>

          {permission === 'granted' && subscribed ? (
            <button
              type="button"
              onClick={() => void handleDisable()}
              disabled={busy}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink"
            >
              {busy ? 'Procesando…' : 'Desactivar en este dispositivo'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleEnable()}
              disabled={busy || permission === 'denied'}
              className="rounded-xl bg-progress px-4 py-2.5 text-sm font-bold text-ink disabled:opacity-50"
            >
              {busy ? 'Activando…' : 'Activar notificaciones'}
            </button>
          )}
        </div>
      )}

      {message && (
        <p className="mt-3 text-sm text-progress" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
