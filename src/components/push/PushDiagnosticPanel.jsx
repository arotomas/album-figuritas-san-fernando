import { useCallback, useEffect, useState } from 'react'
import {
  formatPushDiagDateTime,
  formatToastSource,
  loadPushDiagnosticPanel,
  refreshPushDiagnosticPanel,
} from '../../services/push/pushDiagnosticUi'
import { isPushSupported } from '../../services/push/pushSubscription'

function DiagRow({ label, value, mono = false }) {
  return (
    <div className="grid grid-cols-[9.5rem_1fr] gap-2 border-b border-border/50 py-2 last:border-b-0">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className={`text-xs text-ink ${mono ? 'font-mono break-all' : ''}`}>{value}</dd>
    </div>
  )
}

export function PushDiagnosticPanel() {
  const supported = isPushSupported()
  const [view, setView] = useState(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const next = await refreshPushDiagnosticPanel({ context: 'options_panel' })
      setView(next)
    } catch {
      setView(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!supported) {
      setLoading(false)
      return
    }
    void loadPushDiagnosticPanel()
      .then(setView)
      .finally(() => setLoading(false))
  }, [supported])

  if (!supported) return null

  return (
    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
            Diagnóstico push (temporal)
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-950/80">
            Persiste aunque cierres la app. Enviá una push con la app cerrada, esperá 1 minuto y
            actualizá acá.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 disabled:opacity-50"
        >
          {loading ? 'Leyendo…' : 'Actualizar'}
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-amber-200/80 bg-white p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
          Último evento push recibido
        </p>
        <dl className="mt-2">
          <DiagRow
            label="Fecha y hora"
            value={loading ? '…' : formatPushDiagDateTime(view?.receivedAt)}
          />
          <DiagRow label="Etapa alcanzada" value={loading ? '…' : view?.stage ?? '—'} mono />
          <DiagRow label="Título recibido" value={loading ? '…' : view?.title ?? '—'} />
          <DiagRow label="Estado final" value={loading ? '…' : view?.finalStatus ?? '—'} />
          {view?.error ? <DiagRow label="Error SW" value={view.error} mono /> : null}
          {view?.clientCount != null ? (
            <DiagRow label="Clientes abiertos" value={String(view.clientCount)} />
          ) : null}
          {view?.pendingNotificationCount != null ? (
            <DiagRow
              label="Tras showNotification"
              value={`${view.pendingNotificationCount} en registro SW`}
            />
          ) : null}
          {view?.scenarioHint ? (
            <DiagRow label="Escenario" value={view.scenarioHint} mono />
          ) : null}
        </dl>
      </div>

      <div className="mt-3 rounded-lg border border-amber-200/80 bg-white p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Cliente (al abrir)</p>
        <dl className="mt-2">
          <DiagRow
            label="getNotifications()"
            value={loading ? '…' : String(view?.getNotificationsCount ?? '—')}
          />
          <DiagRow
            label="Última lectura"
            value={loading ? '…' : formatPushDiagDateTime(view?.lastReadAt)}
          />
          <DiagRow
            label="Origen último toast"
            value={loading ? '…' : formatToastSource(view?.toastSource)}
          />
          {view?.getNotificationsTitles?.length > 0 ? (
            <DiagRow
              label="Títulos en OS"
              value={view.getNotificationsTitles.join(' · ')}
            />
          ) : null}
        </dl>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-amber-950/70">
        A = SW no recibió push · B = push sin showNotification OK · C = showNotification OK
      </p>
    </div>
  )
}
