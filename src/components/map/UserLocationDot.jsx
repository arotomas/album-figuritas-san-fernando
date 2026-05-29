import { memo, useEffect, useRef } from 'react'
import { logRotationDelta } from '../../utils/rotationDeltaLog'

function UserLocationDotInner({
  accuracy,
  isCoarse = false,
  heading = null,
  lockHeadingUp = false,
  counterBearing = null,
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

  const prevRotationRef = useRef(null)
  useEffect(() => {
    const next =
      showHeading && rotationDeg != null ? `rotate(${rotationDeg}deg)` : null
    const prev = prevRotationRef.current
    if (prev === next) return
    prevRotationRef.current = next
    logRotationDelta({
      file: 'UserLocationDot.jsx',
      fn: 'useEffect',
      line: 39,
      field: 'userDot.transform',
      reason: lockHeadingUp ? 'counterBearing' : 'compassHeading',
      prev,
      next,
      meta: { lockHeadingUp, rotationDeg },
    })
  }, [lockHeadingUp, rotationDeg, showHeading])

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
        {showHeading && (
          <span
            className="absolute -top-2 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[4px] border-b-[7px] border-x-transparent border-b-white/88 opacity-90"
            aria-hidden
          />
        )}
        <span className={`relative h-4 w-4 rounded-full border-[3px] ${dotClass}`} />
      </div>
    </div>
  )
}

export const UserLocationDot = memo(UserLocationDotInner)
