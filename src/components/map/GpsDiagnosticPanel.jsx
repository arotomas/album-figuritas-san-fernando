import { DEBUG_GPS } from '../../config/gps'
import { useGpsDiagnostics } from '../../hooks/useGpsDiagnostics'
import {
  formatGpsTimestamp,
  getGpsDiscardLabel,
  getGpsErrorLabel,
} from '../../utils/gpsLabels'

function formatCoord(value) {
  return value != null ? value.toFixed(5) : '—'
}

function GpsDiagnosticPanelInner({ onRetry, onRecenter, hasMapPosition }) {
  const gps = useGpsDiagnostics() ?? {}

  const reading = gps.lastRawReading ?? gps.position ?? gps.previewPosition
  const outcome = gps.lastFixOutcome
  const isAccepted = outcome === 'accepted'
  const isDiscarded = outcome === 'discarded'

  const discardLabel =
    isDiscarded && gps.lastDiscarded?.reason
      ? getGpsDiscardLabel(gps.lastDiscarded.reason, gps.lastDiscarded.accuracy)
      : null

  const errorLabel = getGpsErrorLabel(gps.errorType)

  return (
    <div className="safe-top pointer-events-auto absolute left-3 right-3 top-14 z-[501] mx-auto max-w-sm rounded-xl border border-cyan-400/35 bg-zinc-950/95 p-3 font-mono text-[10px] leading-relaxed text-cyan-50/95 shadow-lg backdrop-blur-md">
      <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-wide text-cyan-300">
        Diagnóstico GPS
      </p>

      <div className="space-y-0.5">
        <p>
          GPS:{' '}
          {reading?.accuracy != null
            ? `±${Math.round(reading.accuracy)} m`
            : '—'}
        </p>
        <p>Lat: {formatCoord(reading?.lat)}</p>
        <p>Lng: {formatCoord(reading?.lng)}</p>
        <p>Hora: {formatGpsTimestamp(reading?.timestamp)}</p>
      </div>

      <div className="mt-2 space-y-0.5 border-t border-white/10 pt-2">
        <p>
          Estado:{' '}
          {isAccepted
            ? '✓ Aceptada'
            : isDiscarded
              ? '✗ Descartada'
              : gps.isLoading
                ? 'Buscando…'
                : '—'}
        </p>
        {discardLabel && <p className="text-amber-200">Motivo: {discardLabel}</p>}
        {errorLabel && <p className="text-red-300">Error: {errorLabel}</p>}
        {gps.permission && <p>Permiso: {gps.permission}</p>}
        <p>Watch: {gps.isWatching ? 'activo' : 'inactivo'}</p>
        <p>Updates: {gps.updates ?? 0} · Descartes: {gps.discards ?? 0}</p>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[40px] flex-1 rounded-lg border border-cyan-400/40 bg-cyan-950/60 px-2 py-2 font-sans text-[11px] font-semibold text-cyan-100 active:scale-[0.98]"
        >
          Reintentar ubicación
        </button>
        <button
          type="button"
          onClick={onRecenter}
          disabled={!hasMapPosition}
          className="min-h-[40px] flex-1 rounded-lg border border-white/20 bg-white/10 px-2 py-2 font-sans text-[11px] font-semibold text-white disabled:opacity-40 active:scale-[0.98]"
        >
          Centrar en mi ubicación
        </button>
      </div>
    </div>
  )
}

export function GpsDiagnosticPanel(props) {
  if (!DEBUG_GPS) return null
  return <GpsDiagnosticPanelInner {...props} />
}
