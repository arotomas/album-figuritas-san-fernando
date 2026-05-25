import { memo } from 'react'
import { m } from 'framer-motion'
import { getRarity } from '../../theme/rarity'
import { prefersReducedMotion } from '../../utils/performance'

function RarityAmbienceInner({ rareza }) {
  const rarity = getRarity(rareza)
  const reduced = prefersReducedMotion()
  const count = Math.min(
    rarity.animation.particleCount,
    rarity.tier >= 3 ? 6 : rarity.tier >= 2 ? 4 : 2,
  )

  if (reduced || count <= 0) {
    return (
      <div
        className="pointer-events-none absolute inset-0 rounded-[1.6rem]"
        style={{
          boxShadow: `inset 0 0 48px ${rarity.colors.glow}`,
        }}
        aria-hidden
      />
    )
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.6rem]" aria-hidden>
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(circle at 50% 18%, ${rarity.colors.glow} 0%, transparent 58%)`,
        }}
      />
      {Array.from({ length: count }).map((_, index) => (
        <m.span
          key={index}
          className="absolute h-1 w-1 rounded-full"
          style={{
            backgroundColor: rarity.colors.particle,
            left: `${10 + ((index * 23) % 80)}%`,
            top: `${6 + ((index * 31) % 78)}%`,
            opacity: 0.18 + rarity.tier * 0.06,
          }}
          animate={{
            y: [0, -8 - index, 0],
            opacity: [0.12, 0.38 + rarity.tier * 0.05, 0.12],
          }}
          transition={{
            duration: 2.8 + index * 0.25,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.18,
          }}
        />
      ))}
    </div>
  )
}

export const RarityAmbience = memo(RarityAmbienceInner)

export function getRarityFrameStyle(rareza) {
  const rarity = getRarity(rareza)
  return {
    boxShadow: `${rarity.cssGlow}, 0 24px 48px rgba(0,0,0,0.45)`,
    borderColor: rarity.colors.primary,
  }
}
