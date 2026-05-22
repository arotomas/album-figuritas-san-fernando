import { memo } from 'react'
import { getRarity } from '../../theme/rarity'
import { prefersReducedMotion } from '../../utils/performance'

function ParticleLayerInner({ rareza, intensity = 1, className = '' }) {
  const rarity = getRarity(rareza)
  const reduced = prefersReducedMotion()

  if (reduced) return null

  const count = Math.round(rarity.animation.particleCount * intensity)
  const style = rarity.animation.particleStyle

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, index) => {
        const left = 10 + ((index * 73) % 80)
        const delay = (index * 0.18) % 2
        const size =
          style === 'legendary'
            ? 3 + (index % 3)
            : style === 'spark'
              ? 2
              : 1.5

        return (
          <span
            key={index}
            className={`particle-float absolute rounded-full ${rarity.tailwind.particle}`}
            style={{
              left: `${left}%`,
              bottom: `${(index * 11) % 30}%`,
              width: size,
              height: size,
              opacity: style === 'dust' ? 0.4 : 0.7,
              animationDelay: `${delay}s`,
              animationDuration: style === 'legendary' ? '2.4s' : '2.8s',
            }}
          />
        )
      })}

      {style === 'legendary' && (
        <div
          className="legendary-aura absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: `radial-gradient(circle, ${rarity.colors.glow} 0%, transparent 70%)` }}
        />
      )}
    </div>
  )
}

export const ParticleLayer = memo(ParticleLayerInner)
