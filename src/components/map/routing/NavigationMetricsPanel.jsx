import { memo } from 'react'
import { NAVIGATION_UX_EXPERIMENT, TRANSPORT_MODES } from '../../../config/navigationUx'
import { useLiveRouteMetrics } from '../../../hooks/useLiveRouteMetrics'
import { useNavigationStore } from '../../../store/navigationStore'
import { formatExplorationDistance } from '../../../utils/explorationMap'
import { TransportModeSelector } from './TransportModeSelector'

function formatDurationMinutes(durationSeconds) {
  if (durationSeconds == null || !Number.isFinite(durationSeconds)) return '—'
  return String(Math.max(1, Math.round(durationSeconds / 60)))
}

function resolveDurationLabel(profile) {
  return TRANSPORT_MODES.find((mode) => mode.id === profile)?.durationLabel ?? 'caminando'
}

function NavigationMetricsPanelInner({
  visible,
  metrics,
  userPosition,
  targetCoordinates,
  className = '',
}) {
  const transportProfile = useNavigationStore((state) => state.transportProfile)
  const setTransportProfile = useNavigationStore((state) => state.setTransportProfile)
  const { remainingMeters, remainingSeconds, arrived } = useLiveRouteMetrics(
    userPosition,
    targetCoordinates,
    metrics,
    transportProfile,
  )

  if (!NAVIGATION_UX_EXPERIMENT.enabled || !visible || !metrics?.distanceMeters) {
    return null
  }

  const durationLabel = resolveDurationLabel(transportProfile)

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-[590] flex flex-col items-center px-5 ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      {arrived ? (
        <div className="pointer-events-none mb-2 rounded-full border border-progress/45 bg-progress/15 px-3 py-1.5 shadow-md backdrop-blur-sm">
          <p className="text-center text-[11px] font-semibold text-progress">
            📍 Llegaste al punto
          </p>
        </div>
      ) : null}

      <TransportModeSelector value={transportProfile} onChange={setTransportProfile} />

      <div
        className={`rounded-full border px-3 py-1.5 shadow-md backdrop-blur-sm ${
          arrived
            ? 'border-progress/50 bg-progress/20'
            : 'border-white/10 bg-zinc-950/78'
        }`}
      >
        <p
          className={`text-center text-[11px] font-semibold ${
            arrived ? 'text-progress' : 'text-white/85'
          }`}
        >
          {formatExplorationDistance(remainingMeters ?? metrics.distanceMeters)} ·{' '}
          {formatDurationMinutes(remainingSeconds)} min {durationLabel}
        </p>
        {metrics.source === 'straight' ? (
          <p className="mt-0.5 text-center text-[10px] text-amber-200/75">
            Línea directa — OSRM no disponible
          </p>
        ) : null}
      </div>
    </div>
  )
}

export const NavigationMetricsPanel = memo(NavigationMetricsPanelInner)
