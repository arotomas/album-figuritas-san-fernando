import { memo } from 'react'

function UserLocationDotInner({ accuracy, isCoarse = false }) {
  const dotClass = isCoarse
    ? 'border-white/90 bg-amber-400 shadow-md'
    : 'border-white bg-blue-500 shadow-md'
  const haloClass = isCoarse ? 'bg-amber-400/25' : 'bg-blue-500/20'
  const ringClass = isCoarse ? 'bg-amber-400/15' : 'bg-blue-400/20'

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

      <span className={`relative h-4 w-4 rounded-full border-[3px] ${dotClass}`} />
    </div>
  )
}

export const UserLocationDot = memo(UserLocationDotInner)
