import { useEffect, useMemo, useState } from 'react'
import { useCollectionAvailabilityContext } from '../../hooks/useCollectionAvailability'
import { getQaRuntimeState, subscribeQaRuntime } from '../../qa/qaState'
import { isLocationBypassEnabled } from '../../qa/qaCore'
import {
  buildQaAvailabilitySummary,
  clearQaMockPosition,
  getEffectiveAcceptMaxAccuracyM,
  getQaSanFernandoStatus,
  teleportQaNearFigure,
  teleportQaToPreset,
} from '../../qa/qaLocation'
import { getGeoPolicyMode, isWithinPrimaryArea } from '../../geo/geoPolicy'

function formatCoord(value) {
  return value != null ? value.toFixed(5) : '—'
}

function sfStatusLabel(status, qaBypass) {
  if (status === 'unknown') return '—'
  if (status === 'inside') return 'dentro SF'
  if (qaBypass) return 'fuera SF (QA ok)'
  return 'fuera SF'
}

export function QaLocationPanel({
  mapPosition,
  isWatching,
  figureCount = 0,
  nearFigure,
  figures = [],
}) {
  const availabilityContext = useCollectionAvailabilityContext()
  const [expanded, setExpanded] = useState(false)
  const [mockActive, setMockActive] = useState(() => Boolean(getQaRuntimeState().mockPosition))

  useEffect(() => {
    const sync = () => setMockActive(Boolean(getQaRuntimeState().mockPosition))
    sync()
    return subscribeQaRuntime(sync)
  }, [])

  const sfStatus = useMemo(
    () => getQaSanFernandoStatus(mapPosition?.lat, mapPosition?.lng),
    [mapPosition?.lat, mapPosition?.lng],
  )

  const availabilitySummary = useMemo(
    () => buildQaAvailabilitySummary(availabilityContext),
    [availabilityContext],
  )

  const qaBypass = isLocationBypassEnabled()
  const acceptMax = getEffectiveAcceptMaxAccuracyM()
  const geoMode = getGeoPolicyMode()

  return (
    <div className="pointer-events-auto absolute bottom-24 left-3 z-[502] max-w-[min(100vw-1.5rem,18rem)]">
      <div className="mb-1 flex items-center gap-2">
        {mockActive && (
          <span className="rounded-full border border-fuchsia-400/40 bg-fuchsia-950/80 px-2 py-0.5 font-sans text-[9px] font-semibold uppercase text-fuchsia-200">
            mock
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="rounded-full border border-white/20 bg-zinc-950/90 px-3 py-1 font-sans text-[10px] font-semibold text-white/90 shadow"
      >
        {expanded ? 'Ocultar QA' : 'Panel QA'}
      </button>

      {expanded && (
        <div className="mt-1 max-h-[42vh] overflow-y-auto rounded-xl border border-white/15 bg-zinc-950/95 p-3 font-mono text-[10px] leading-relaxed text-white/90 shadow-lg backdrop-blur-md">
          <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-wide text-amber-200">
            Ubicación
          </p>
          <p>lat: {formatCoord(mapPosition?.lat)}</p>
          <p>lng: {formatCoord(mapPosition?.lng)}</p>
          <p>
            accuracy:{' '}
            {mapPosition?.accuracy != null
              ? `${Math.round(mapPosition.accuracy)} m`
              : '—'}
          </p>
          <p>watch: {isWatching ? 'activo' : 'inactivo'}</p>
          <p>geo policy: {geoMode}</p>
          <p>
            SF: {sfStatusLabel(sfStatus, qaBypass)}
            {mapPosition &&
              ` (${isWithinPrimaryArea(mapPosition.lat, mapPosition.lng) ? 'bounds ok' : 'bounds off'})`}
          </p>
          <p>aceptación QA: ±{acceptMax} m</p>

          <p className="mb-1 mt-3 font-sans text-[11px] font-bold uppercase tracking-wide text-amber-200">
            Mapa
          </p>
          <p>figuras visibles: {figureCount}</p>
          <p>cercana: {nearFigure?.nombre ?? '—'}</p>

          <p className="mb-1 mt-3 font-sans text-[11px] font-bold uppercase tracking-wide text-amber-200">
            Availability
          </p>
          <p>{availabilitySummary}</p>

          <p className="mb-2 mt-3 font-sans text-[11px] font-bold uppercase tracking-wide text-amber-200">
            Teleport
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => teleportQaToPreset('plaza')}
              className="min-h-[36px] rounded-lg border border-emerald-400/35 bg-emerald-950/50 px-2 py-1.5 font-sans text-[10px] font-semibold text-emerald-100 active:scale-[0.98]"
            >
              Plaza
            </button>
            <button
              type="button"
              onClick={() => teleportQaToPreset('demo')}
              className="min-h-[36px] rounded-lg border border-emerald-400/35 bg-emerald-950/50 px-2 py-1.5 font-sans text-[10px] font-semibold text-emerald-100 active:scale-[0.98]"
            >
              Punto demo
            </button>
            <button
              type="button"
              onClick={() => teleportQaNearFigure(figures, { fromPosition: mapPosition })}
              className="col-span-2 min-h-[36px] rounded-lg border border-cyan-400/35 bg-cyan-950/50 px-2 py-1.5 font-sans text-[10px] font-semibold text-cyan-100 active:scale-[0.98]"
            >
              Figurita cercana
            </button>
            {mockActive && (
              <button
                type="button"
                onClick={() => clearQaMockPosition()}
                className="col-span-2 min-h-[36px] rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 font-sans text-[10px] font-semibold text-white/80 active:scale-[0.98]"
              >
                Volver a GPS real
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
