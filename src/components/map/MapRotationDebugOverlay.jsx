/**
 * Overlay DEV: bearing / target / speed de rotación cinematográfica.
 */

export function MapRotationDebugOverlay({ debug, paused, cinematicActive }) {
  if (!import.meta.env.DEV || !debug) return null

  const fmt = (value) =>
    value == null || !Number.isFinite(value) ? '—' : `${Math.round(value)}°`

  return (
    <div
      className="pointer-events-none absolute bottom-24 left-2 z-[480] max-w-[168px] rounded-lg border border-white/15 bg-black/75 px-2 py-1.5 font-mono text-[9px] leading-relaxed text-white/85 backdrop-blur-sm"
      aria-hidden
    >
      <p className="font-bold text-lime-300/90">[ROTATION]</p>
      <p>pub {fmt(debug.published)}</p>
      <p>smo {fmt(debug.smoothed)}</p>
      <p>tgt {fmt(debug.target)}</p>
      <p>cog {fmt(debug.rawCog)}</p>
      <p>
        spd{' '}
        {debug.speed != null && Number.isFinite(debug.speed)
          ? `${debug.speed.toFixed(2)} m/s`
          : '—'}
      </p>
      <p>
        {paused ? '⏸ pan' : cinematicActive ? '▶ walk' : debug.quiet ? '◼ quiet' : '○ idle'}
      </p>
    </div>
  )
}
