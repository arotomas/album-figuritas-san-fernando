import { memo } from 'react'

const TONE = {
  searching: 'border-white/15 bg-zinc-900/85 text-white/80',
  refining: 'border-lime-400/25 bg-zinc-900/85 text-lime-100/90',
  ready: 'border-lime-400/20 bg-zinc-900/75 text-lime-200/80',
  warn: 'border-amber-400/30 bg-zinc-900/90 text-amber-100/90',
}

function MapGpsStatusInner({ label, phase = 'searching', showDot = true }) {
  const tone = TONE[phase] ?? TONE.searching

  return (
    <div
      className={`safe-top pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center px-4`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`flex items-center gap-2 rounded-full border px-4 py-2 shadow-md backdrop-blur-sm ${tone}`}
      >
        {showDot && (
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              phase === 'ready'
                ? 'bg-lime-400'
                : phase === 'warn'
                  ? 'bg-amber-400'
                  : 'map-skeleton-pulse bg-white/70'
            }`}
            aria-hidden
          />
        )}
        <span className="text-xs font-medium">{label}</span>
      </div>
    </div>
  )
}

export const MapGpsStatus = memo(MapGpsStatusInner)
