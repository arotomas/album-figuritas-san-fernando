import { useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  getRingProximityColors,
  getRingVisualStyle,
  RING_BASE_COLOR,
  RING_PROGRESS_COLOR,
} from '../../utils/proximityExperience'
import { PROXIMITY_PHASES } from '../../config/proximity'

const SIZE = 220
const STROKE = 5
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function RingParticles({ intensity, color }) {
  if (intensity <= 0) return null

  const count = Math.max(2, Math.min(5, Math.round(intensity * 6)))
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
            opacity: 0.2 + intensity * 0.35,
          }}
          animate={{
            y: [0, -8 - intensity * 6, 0],
            opacity: [0.18, 0.45 + intensity * 0.25, 0.18],
          }}
          transition={{
            duration: 2.8 + index * 0.12,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.15,
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
}) {
  const clamped = Math.min(1, Math.max(0, progress))
  const dashOffset = CIRCUMFERENCE * (1 - clamped)
  const progressOpacity = clamped <= 0 ? 0 : 0.55 + clamped * 0.45
  const haloOpacity = clamped <= 0 ? 0 : 0.1 + clamped * 0.18

  const phase = isReady ? PROXIMITY_PHASES.CAPTURE : proximityPhase
  const visualStyle = useMemo(() => getRingVisualStyle(phase), [phase])
  const ringColors = useMemo(
    () => getRingProximityColors(progress, { isReady }),
    [isReady, progress],
  )

  const lastPhaseRef = useRef(phase)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    if (lastPhaseRef.current === phase) return
    lastPhaseRef.current = phase
    console.info('[RING-STATE]', {
      phase,
      progress: Math.round(clamped * 1000) / 1000,
      isReady,
    })
  }, [clamped, isReady, phase])

  const containerOpacity = Math.max(
    visualStyle.opacity,
    progress > 0.02 ? 0.4 : visualStyle.opacity,
  )

  return (
    <motion.div
      className="pointer-events-none relative flex items-center justify-center"
      animate={{
        opacity: containerOpacity,
        scale: visualStyle.scale,
      }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        animate={{
          opacity: isReady ? [0.28, 0.58, 0.28] : ringColors.glowIntensity * 0.7 + 0.06,
          scale: isReady ? [1, 1.08, 1] : 0.94 + ringColors.glowIntensity * 0.06,
        }}
        transition={{
          duration: isReady ? 1.8 : 0.45,
          repeat: isReady ? Infinity : 0,
          ease: 'easeInOut',
        }}
        className="absolute h-56 w-56 rounded-full blur-md"
        style={{ backgroundColor: ringColors.glow }}
      />

      <RingParticles
        intensity={visualStyle.particleIntensity}
        color={ringColors.particle}
      />

      <svg width={SIZE} height={SIZE} className="-rotate-90" aria-hidden="true">
        <defs>
          <filter id="ring-progress-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={RING_BASE_COLOR}
          strokeWidth={visualStyle.strokeWidth}
        />

        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={RING_PROGRESS_COLOR}
          strokeWidth={visualStyle.strokeWidth + 2}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          animate={{ strokeDashoffset: dashOffset, opacity: haloOpacity }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        />

        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={RING_PROGRESS_COLOR}
          strokeWidth={visualStyle.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          filter="url(#ring-progress-glow)"
          animate={{ strokeDashoffset: dashOffset, opacity: progressOpacity }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ boxShadow: ringColors.frameGlow }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative h-44 w-44 rounded-3xl border-2 transition-colors duration-500"
          style={{ borderColor: ringColors.frameBorder }}
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
