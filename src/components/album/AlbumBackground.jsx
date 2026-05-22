import { memo } from 'react'
import { getRarity } from '../../theme/rarity'
import { album } from '../../theme/album'
import { ParticleLayer } from '../ui/ParticleLayer'
import { prefersReducedMotion } from '../../utils/performance'

function AlbumBackgroundInner({ rareza, className = '' }) {
  const rarity = getRarity(rareza)
  const reduced = prefersReducedMotion()

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
    >
      {/* Base warm gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-warm-white via-[#f7f6f3] to-[#f0efec]" />

      {/* Rarity-tinted ambient glow */}
      <div
        className="album-bg-glow absolute inset-0 transition-opacity duration-700"
        style={{
          background: `radial-gradient(ellipse 90% 60% at 50% 18%, ${rarity.colors.glow}, transparent 65%)`,
          opacity: album.background.glowOpacity,
        }}
      />

      {/* Soft top light */}
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/60 to-transparent" />

      {/* Subtle vignette for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(17,17,19,${album.background.vignetteStrength}) 100%)`,
        }}
      />

      {!reduced && (
        <ParticleLayer
          rareza={rareza}
          intensity={album.background.particleIntensity}
          className="opacity-40"
        />
      )}
    </div>
  )
}

export const AlbumBackground = memo(AlbumBackgroundInner)
