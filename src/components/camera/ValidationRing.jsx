import { motion } from 'framer-motion'

const SIZE = 220
const STROKE = 5
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function ValidationRing({ progress = 0, isReady = false }) {
  const offset = CIRCUMFERENCE * (1 - Math.min(Math.max(progress, 0), 1))

  return (
    <div className="pointer-events-none relative flex items-center justify-center">
      {/* Outer glow when ready */}
      {isReady && (
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute h-56 w-56 rounded-full bg-lime-400/20 blur-md"
        />
      )}

      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={STROKE}
        />
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={isReady ? '#84cc16' : '#ffffff'}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </svg>

      {/* Corner brackets */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`relative h-44 w-44 rounded-3xl border-2 transition-colors duration-500 ${
            isReady ? 'border-lime-400/80' : 'border-white/30'
          }`}
        >
          <span className="absolute -left-px -top-px h-6 w-6 border-l-2 border-t-2 border-white/60" />
          <span className="absolute -right-px -top-px h-6 w-6 border-r-2 border-t-2 border-white/60" />
          <span className="absolute -bottom-px -left-px h-6 w-6 border-b-2 border-l-2 border-white/60" />
          <span className="absolute -bottom-px -right-px h-6 w-6 border-b-2 border-r-2 border-white/60" />
        </div>
      </div>
    </div>
  )
}
