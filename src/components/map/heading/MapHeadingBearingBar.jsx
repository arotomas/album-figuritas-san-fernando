import { memo } from 'react'

function MapHeadingBearingBarInner({ bearing, active }) {
  if (!active || bearing == null || !Number.isFinite(bearing)) return null

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[calc(max(0.5rem,env(safe-area-inset-top))+3.25rem)] z-[480] flex justify-center"
      aria-hidden
    >
      <div className="flex items-center gap-2 rounded-full border border-white/15 bg-zinc-950/80 px-3 py-1.5 shadow-md backdrop-blur-sm">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
          Rumbo
        </span>
        <div
          className="flex h-6 w-6 items-center justify-center transition-transform duration-[640ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `rotate(${bearing}deg)` }}
        >
          <span className="h-0 w-0 border-x-[5px] border-b-[10px] border-x-transparent border-b-sky-300" />
        </div>
        <span className="min-w-[2.5rem] text-right font-mono text-[11px] font-bold text-white/90">
          {Math.round(bearing)}°
        </span>
      </div>
    </div>
  )
}

export const MapHeadingBearingBar = memo(MapHeadingBearingBarInner)
