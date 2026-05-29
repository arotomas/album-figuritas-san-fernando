import { memo } from 'react'

function MapHeadingCompassInner({ bearing, active }) {
  if (!active || bearing == null || !Number.isFinite(bearing)) return null

  const ringRotation = -bearing

  return (
    <div
      className="pointer-events-none absolute bottom-24 left-4 z-[480] flex h-[4.5rem] w-[4.5rem] items-center justify-center"
      aria-hidden
    >
      <div className="relative h-full w-full rounded-full border border-white/20 bg-zinc-950/75 shadow-lg backdrop-blur-sm">
        <div
          className="absolute inset-1 transition-transform duration-[640ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `rotate(${ringRotation}deg)` }}
        >
          <span className="absolute left-1/2 top-0.5 -translate-x-1/2 text-[9px] font-black text-sky-300">
            N
          </span>
          <span className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-white/45">
            E
          </span>
          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] font-black text-white/45">
            S
          </span>
          <span className="absolute left-0.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-white/45">
            O
          </span>
          <span className="absolute left-1/2 top-[16%] h-0 w-0 -translate-x-1/2 border-x-[5px] border-b-[9px] border-x-transparent border-b-sky-300" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-white/90 shadow" />
        </div>
      </div>
      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white/80">
        {Math.round(bearing)}°
      </span>
    </div>
  )
}

export const MapHeadingCompass = memo(MapHeadingCompassInner)
