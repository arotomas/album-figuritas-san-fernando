import { memo } from 'react'
import { formatExplorationDistance } from '../../../utils/explorationMap'

function formatWalkingMinutes(durationSeconds) {
  if (durationSeconds == null || !Number.isFinite(durationSeconds)) return '—'
  return String(Math.max(1, Math.round(durationSeconds / 60)))
}

function RouteMetricsBadgeInner({ visible, metrics, className = '' }) {
  if (!visible || !metrics?.distanceMeters) return null

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-[590] flex justify-center px-5 ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <div className="rounded-full border border-white/10 bg-zinc-950/78 px-3 py-1.5 shadow-md backdrop-blur-sm">
        <p className="text-center text-[11px] font-semibold text-white/85">
          {formatExplorationDistance(metrics.distanceMeters)} ·{' '}
          {formatWalkingMinutes(metrics.durationSeconds)} min caminando
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

export const RouteMetricsBadge = memo(RouteMetricsBadgeInner)
