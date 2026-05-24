import { useEffect, useMemo } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import { getRingVisualStyle } from '../../utils/proximityExperience'
import { getRarity } from '../../theme/rarity'
import { PROXIMITY_PHASES } from '../../config/proximity'

const SIZE = 220
const STROKE = 5
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function RingParticles({ intensity, color }) {
  if (intensity <= 0) return null

  const count = Math.max(2, Math.round(intensity * 8))
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: count }).map((_, index) => (
        <motion.span
          key={index}
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor: color,
            left: `${12 + ((index * 17) % 76)}%`,
            top: `${8 + ((index * 23) % 84)}%`,
            opacity: 0.25 + intensity * 0.45,
          }}
          animate={{
            y: [0, -10 - intensity * 8, 0],
            opacity: [0.2, 0.55 + intensity * 0.35, 0.2],
            scale: [0.8, 1.1 + intensity * 0.2, 0.8],
          }}
          transition={{
            duration: 2.4 + index * 0.15,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.12,
          }}
        />
      ))}
    </div>
  )
}

export function ValidationRing({
  progress = 0,
  isReady = false,
  proximityPhase = PROXIMITY_PHASES.NONE,
  rarity = 'común',
}) {
  const springProgress = useSpring(progress, {
    stiffness: 42,
    damping: 18,
    mass: 0.9,
  })

  useEffect(() => {
    springProgress.set(progress)
  }, [progress, springProgress])

  const dashOffset = useTransform(springProgress, (value) => {
    const clamped = Math.min(1, Math.max(0, value))
    return CIRCUMFERENCE * (1 - clamped)
  })

  const visualStyle = useMemo(
    () => getRingVisualStyle(isReady ? PROXIMITY_PHASES.CAPTURE : proximityPhase, rarity),
    [isReady, proximityPhase, rarity],
  )
  const rarityTheme = getRarity(rarity)
  const ringColor = isReady ? '#8cc63f' : rarityTheme.colors.primary

  return (
    <motion.div
      className="pointer-events-none relative flex items-center justify-center"
      animate={{
        opacity: visualStyle.opacity,
        scale: visualStyle.scale,
      }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        animate={{
          opacity: isReady ? [0.35, 0.75, 0.35] : visualStyle.glowOpacity,
          scale: isReady ? [1, 1.12, 1] : 1,
        }}
        transition={{
          duration: isReady ? 1.6 : 0.8,
          repeat: isReady ? Infinity : 0,
          ease: 'easeInOut',
        }}
        className="absolute h-56 w-56 rounded-full blur-md"
        style={{
          backgroundColor: isReady ? 'rgba(140,198,63,0.35)' : rarityTheme.colors.glow,
        }}
      />

      <RingParticles intensity={visualStyle.particleIntensity} color={rarityTheme.colors.particle} />

      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={visualStyle.strokeWidth}
        />
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={ringColor}
          strokeWidth={visualStyle.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          style={{ strokeDashoffset: dashOffset }}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{
            boxShadow: isReady
              ? '0 0 28px rgba(140,198,63,0.45)'
              : `0 0 18px ${rarityTheme.colors.glow}`,
          }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className={`relative h-44 w-44 rounded-3xl border-2 transition-colors duration-700 ${
            isReady ? 'border-progress/80' : 'border-white/25'
          }`}
        >
          <span className="absolute -left-px -top-px h-6 w-6 border-l-2 border-t-2 border-white/50" />
          <span className="absolute -right-px -top-px h-6 w-6 border-r-2 border-t-2 border-white/50" />
          <span className="absolute -bottom-px -left-px h-6 w-6 border-b-2 border-l-2 border-white/50" />
          <span className="absolute -bottom-px -right-px h-6 w-6 border-b-2 border-r-2 border-white/50" />
        </motion.div>
      </div>
    </motion.div>
  )
}
