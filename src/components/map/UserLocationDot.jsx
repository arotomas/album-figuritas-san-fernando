import { memo } from 'react'

function UserLocationDotInner({
  accuracy,
  isCoarse = false,
  heading = null,
  lockHeadingUp = false,
  counterBearing = null,
  enhancedHeading = false,
}) {
  const dotClass = isCoarse
    ? 'border-white/90 bg-amber-400 shadow-md'
    : 'border-white bg-blue-500 shadow-md'
  const haloClass = isCoarse ? 'bg-amber-400/25' : 'bg-blue-500/20'
  const ringClass = isCoarse ? 'bg-amber-400/15' : 'bg-blue-400/20'
  const showHeading =
    lockHeadingUp || (heading != null && Number.isFinite(heading))
  const rotationDeg = lockHeadingUp
    ? counterBearing ?? 0
    : heading

  return (
    <div className="relative flex items-center justify-center">
      {accuracy && (
        <span
          className={`absolute rounded-full ${ringClass}`}
          style={{
            width: Math.min(Math.max(accuracy * 0.5, 24), 80),
            height: Math.min(Math.max(accuracy * 0.5, 24), 80),
          }}
        />
      )}

      <span className={`user-dot-pulse absolute h-7 w-7 rounded-full ${haloClass}`} />

      <div
        className="relative flex items-center justify-center transition-transform duration-[640ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={
          showHeading && rotationDeg != null
            ? { transform: `rotate(${rotationDeg}deg)` }
            : undefined
        }
      >
        {enhancedHeading && showHeading && (
          <span
            className="absolute inset-0 rounded-full border border-dashed border-white/25"
            aria-hidden
          />
        )}
        {showHeading && (
          <span
            className={`absolute left-1/2 -translate-x-1/2 border-x-transparent border-b-white/88 opacity-90 ${
              enhancedHeading
                ? '-top-3.5 h-0 w-0 border-x-[6px] border-b-[12px]'
                : '-top-2 h-0 w-0 border-x-[4px] border-b-[7px]'
            }`}
            aria-hidden
          />
        )}
        {enhancedHeading && showHeading && (
          <span
            className="absolute -bottom-3 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white/35"
            aria-hidden
          />
        )}
        <span className={`relative rounded-full border-[3px] ${dotClass} ${enhancedHeading ? 'h-5 w-5' : 'h-4 w-4'}`} />
      </div>
    </div>
  )
}

export const UserLocationDot = memo(UserLocationDotInner)
