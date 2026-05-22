import { memo } from 'react'
import { prefersReducedMotion } from '../../utils/performance'

function ShineEffectInner({ className = '', active = true, rarityShine = 'via-white/20' }) {
  if (!active || prefersReducedMotion()) return null

  return (
    <div
      className={`shine-sweep pointer-events-none absolute inset-0 z-20 overflow-hidden ${className}`}
      aria-hidden
    >
      <div
        className={`absolute inset-0 skew-x-12 bg-gradient-to-r from-transparent ${rarityShine} to-transparent`}
      />
    </div>
  )
}

export const ShineEffect = memo(ShineEffectInner)
