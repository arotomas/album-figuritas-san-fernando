import { memo } from 'react'

function UserLocationDotInner({ accuracy }) {
  return (
    <div className="relative flex items-center justify-center">
      {accuracy && (
        <span
          className="absolute rounded-full bg-blue-400/20"
          style={{
            width: Math.min(Math.max(accuracy * 0.5, 24), 80),
            height: Math.min(Math.max(accuracy * 0.5, 24), 80),
          }}
        />
      )}

      <span className="user-dot-pulse absolute h-7 w-7 rounded-full bg-blue-500/20" />

      <span className="relative h-4 w-4 rounded-full border-[3px] border-white bg-blue-500 shadow-md" />
    </div>
  )
}

export const UserLocationDot = memo(UserLocationDotInner)
