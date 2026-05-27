import { MAP_ROTATION_QUIET_LOCK_MS } from '../../config/mapRotation'

/**
 * Overlay DEV: bearing / target / speed / estado quiet de rotación cinematográfica.
 */

const MODE_LABELS = {
  walking: '▶ walking active',
  quiet_locked: '◼ quiet locked',
  wake_pending: '◌ wake pending',
  settling: '… settling',
  hold: '■ hold',
  idle: '○ idle',
  paused: '⏸ pan',
}

export function MapRotationDebugOverlay({ debug, paused, cinematicActive }) {
  if (!import.meta.env.DEV) return null
  if (!debug && !cinematicActive && !paused) return null

  const fmt = (value) =>
    value == null || !Number.isFinite(value) ? '—' : `${Math.round(value)}°`

  const modeKey = paused ? 'paused' : debug?.mode ?? (cinematicActive ? 'walking' : 'idle')
  const modeLabel = MODE_LABELS[modeKey] ?? modeKey

  return (
    <div
      className="pointer-events-none absolute bottom-24 left-2 z-[480] max-w-[180px] rounded-lg border border-white/15 bg-black/75 px-2 py-1.5 font-mono text-[9px] leading-relaxed text-white/85 backdrop-blur-sm"
      aria-hidden
    >
      <p className="font-bold text-lime-300/90">[ROTATION]</p>
      <p className={debug?.quietLocked ? 'text-amber-200' : 'text-white/85'}>{modeLabel}</p>
      <p>pub {fmt(debug?.published)}</p>
      <p>smo {fmt(debug?.smoothed)}</p>
      <p>tgt {fmt(debug?.target)}</p>
      <p>cog {fmt(debug?.rawCog)}</p>
      <p>
        spd{' '}
        {debug?.speed != null && Number.isFinite(debug.speed)
          ? `${debug.speed.toFixed(2)}`
          : '—'}
        {debug?.impliedSpeed != null && Number.isFinite(debug.impliedSpeed)
          ? ` (Δ ${debug.impliedSpeed.toFixed(2)})`
          : ''}
      </p>
      {debug?.distFromLock != null && (
        <p>lock Δ {debug.distFromLock.toFixed(1)}m</p>
      )}
      {debug?.lowSpeedMs != null && debug.mode === 'settling' && (
        <p>lock in {Math.max(0, MAP_ROTATION_QUIET_LOCK_MS - debug.lowSpeedMs)}ms</p>
      )}
    </div>
  )
}
