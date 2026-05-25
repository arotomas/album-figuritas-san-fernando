import { useCallback, useMemo, useState } from 'react'
import { isDebugGpsEnabled } from '../../qa/qaCore'
import { useGpsDiagnostics } from '../../hooks/useGpsDiagnostics'
import {
  buildGpsDiagnosticReport,
  copyGpsDiagnosticReport,
  readSavedPositionForDiagnostics,
} from '../../utils/gpsDiagnosticReport'
import {
  formatGpsTimestamp,
  getGpsDiscardLabel,
  getGpsErrorLabel,
} from '../../utils/gpsLabels'

function formatCoord(value) {
  return value != null ? value.toFixed(5) : '—'
}

function formatOptional(value, suffix = '') {
  if (value == null || Number.isNaN(value)) return '—'
  return `${Math.round(value * 10) / 10}${suffix}`
}

function Section({ title, children }) {
  return (
    <div className="border-t border-white/10 pt-2">
      <p className="mb-1 font-sans text-[10px] font-bold uppercase tracking-wide text-cyan-300/90">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function GpsDiagnosticPanelInner({
  geolocationAvailable,
  permission,
  trustedPosition,
  onRequestSingleFix,
  onRetryPrecise,
  onStartTracking,
  onStopTracking,
  onRecenter,
  hasMapPosition,
  proximityNearest,
  rawNearest,
  isNearFigure,
  nearFigure,
  defaultExpanded = false,
}) {
  const gps = useGpsDiagnostics() ?? {}
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [copyState, setCopyState] = useState('idle')

  const reading = gps.lastRawReading ?? gps.previewPosition ?? gps.position
  const isAccepted = gps.lastFixOutcome === 'accepted'
  const isDiscarded = gps.lastFixOutcome === 'discarded'
  const lastSavedPosition =
    gps.lastSavedPosition ?? readSavedPositionForDiagnostics()

  const discardLabel =
    isDiscarded && gps.lastDiscarded?.reason
      ? getGpsDiscardLabel(gps.lastDiscarded.reason, gps.lastDiscarded.accuracy)
      : null

  const errorLabel = getGpsErrorLabel(gps.errorType)

  const report = useMemo(
    () =>
      buildGpsDiagnosticReport({
        gps,
        geolocationAvailable,
        permission,
        trustedPosition,
        lastSavedPosition,
        proximityNearest,
        rawNearest,
        isNearFigure,
        nearFigure,
      }),
    [
      geolocationAvailable,
      gps,
      isNearFigure,
      lastSavedPosition,
      nearFigure,
      permission,
      proximityNearest,
      rawNearest,
      trustedPosition,
    ],
  )

  const handleCopy = useCallback(async () => {
    const ok = await copyGpsDiagnosticReport(report)
    setCopyState(ok ? 'copied' : 'error')
    setTimeout(() => setCopyState('idle'), 1800)
  }, [report])

  return (
    <div className="safe-top pointer-events-auto absolute inset-x-3 top-14 z-[501] mx-auto max-w-sm">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mb-1 rounded-full border border-cyan-400/35 bg-zinc-950/95 px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-wide text-cyan-200 shadow"
      >
        {expanded ? 'Ocultar' : 'Mostrar'} diagnóstico GPS
      </button>

      {expanded && (
        <div className="max-h-[58vh] overflow-y-auto rounded-xl border border-cyan-400/35 bg-zinc-950/95 p-3 font-mono text-[10px] leading-relaxed text-cyan-50/95 shadow-lg backdrop-blur-md">
          <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-wide text-cyan-300">
            Diagnóstico GPS
          </p>

          <Section title="Permisos">
            <p>navigator.geolocation: {geolocationAvailable ? 'sí' : 'no'}</p>
            <p>permiso location: {permission ?? gps.permission ?? 'unknown'}</p>
          </Section>

          <Section title="GPS crudo">
            <p>source: {gps.lastApiSource ?? '—'}</p>
            <p>Lat: {formatCoord(reading?.lat)}</p>
            <p>Lng: {formatCoord(reading?.lng)}</p>
            <p>
              accuracy:{' '}
              {reading?.accuracy != null
                ? `${Math.round(reading.accuracy)} m`
                : '—'}
            </p>
            <p>
              altitudeAccuracy:{' '}
              {formatOptional(reading?.altitudeAccuracy, ' m')}
            </p>
            <p>speed: {formatOptional(reading?.speed, ' m/s')}</p>
            <p>heading: {formatOptional(reading?.heading, '°')}</p>
            <p>Hora local: {formatGpsTimestamp(reading?.timestamp)}</p>
          </Section>

          <Section title="Estado interno app">
            <p>ubicación aceptada: {isAccepted ? 'sí' : 'no'}</p>
            <p>motivo descarte: {discardLabel ?? '—'}</p>
            <p>
              última válida guardada:{' '}
              {lastSavedPosition
                ? `${formatCoord(lastSavedPosition.lat)}, ${formatCoord(lastSavedPosition.lng)} (±${Math.round(lastSavedPosition.accuracy ?? 0)}m)`
                : '—'}
            </p>
            <p>
              posición confiable:{' '}
              {trustedPosition
                ? `${formatCoord(trustedPosition.lat)}, ${formatCoord(trustedPosition.lng)}`
                : '—'}
            </p>
            <p>
              Último fix válido:{' '}
              {formatGpsTimestamp(gps.lastValidFixAt ?? reading?.timestamp)}
            </p>
            <p>watchPosition: {gps.isWatching ? 'activo' : 'inactivo'}</p>
            {gps.isGpsStalled && (
              <p className="text-amber-300">
                estado: {gps.gpsStalledMessage ?? 'GPS detenido o sin señal'}
              </p>
            )}
            {errorLabel && <p className="text-red-300">error: {errorLabel}</p>}
            <p>
              updates: {gps.updates ?? 0} · descartes: {gps.discards ?? 0}
            </p>
          </Section>

          <Section title="Proximidad">
            <p>figurita cercana detectada: {isNearFigure ? 'sí' : 'no'}</p>
            <p>cercana (proximidad): {nearFigure?.nombre ?? '—'}</p>
            <p>
              distancia proximidad:{' '}
              {proximityNearest?.distanceMeters != null
                ? `${Math.round(proximityNearest.distanceMeters)} m`
                : '—'}
            </p>
            <p>figurita más cercana (mapa): {rawNearest?.figure?.nombre ?? '—'}</p>
            <p>
              distancia mapa:{' '}
              {rawNearest?.distanceMeters != null
                ? `${Math.round(rawNearest.distanceMeters)} m`
                : '—'}
            </p>
          </Section>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRetryPrecise}
              className="col-span-2 min-h-[40px] rounded-lg border border-amber-400/40 bg-amber-950/50 px-2 py-2 font-sans text-[10px] font-semibold text-amber-100 active:scale-[0.98]"
            >
              Reintentar ubicación precisa
            </button>
            <button
              type="button"
              onClick={onRequestSingleFix}
              className="min-h-[40px] rounded-lg border border-cyan-400/40 bg-cyan-950/60 px-2 py-2 font-sans text-[10px] font-semibold text-cyan-100 active:scale-[0.98]"
            >
              Pedir ubicación una vez
            </button>
            <button
              type="button"
              onClick={onStartTracking}
              className="min-h-[40px] rounded-lg border border-emerald-400/35 bg-emerald-950/50 px-2 py-2 font-sans text-[10px] font-semibold text-emerald-100 active:scale-[0.98]"
            >
              Iniciar seguimiento
            </button>
            <button
              type="button"
              onClick={onStopTracking}
              className="min-h-[40px] rounded-lg border border-amber-400/35 bg-amber-950/40 px-2 py-2 font-sans text-[10px] font-semibold text-amber-100 active:scale-[0.98]"
            >
              Detener seguimiento
            </button>
            <button
              type="button"
              onClick={onRecenter}
              disabled={!hasMapPosition}
              className="min-h-[40px] rounded-lg border border-white/20 bg-white/10 px-2 py-2 font-sans text-[10px] font-semibold text-white disabled:opacity-40 active:scale-[0.98]"
            >
              Centrar mapa
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="col-span-2 min-h-[40px] rounded-lg border border-white/15 bg-white/5 px-2 py-2 font-sans text-[10px] font-semibold text-white/90 active:scale-[0.98]"
            >
              {copyState === 'copied'
                ? 'Diagnóstico copiado'
                : copyState === 'error'
                  ? 'No se pudo copiar'
                  : 'Copiar diagnóstico'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function GpsDiagnosticPanel(props) {
  return (
    <GpsDiagnosticPanelInner
      {...props}
      defaultExpanded={isDebugGpsEnabled()}
    />
  )
}
