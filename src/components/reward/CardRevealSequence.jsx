import { useEffect, useRef, useState } from 'react'
import { m } from 'framer-motion'
import { getRarity } from '../../theme/rarity'
import { motion as motionTokens } from '../../theme/motion'
import { typeClasses } from '../../theme/typography'
import { ParticleLayer } from '../ui/ParticleLayer'
import { PremiumRewardCard } from './PremiumRewardCard'
import { prefersReducedMotion } from '../../utils/performance'
import { rewardLog } from '../../utils/devLog'

const PHASES = {
  ENTER: 'enter',
  FLIP: 'flip',
  REVEAL: 'reveal',
  SHINE: 'shine',
  INFO: 'info',
  DONE: 'done',
}

export function CardRevealSequence({ figure, photoUrl, onComplete }) {
  const [phase, setPhase] = useState(PHASES.ENTER)
  const rarity = getRarity(figure.rareza)
  const reduced = prefersReducedMotion()
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    rewardLog.info('reveal started', { figureId: figure?.id })
    const timings = reduced
      ? { enter: 200, flip: 400, reveal: 600, shine: 800, info: 1200, done: 2000 }
      : { enter: 400, flip: 900, reveal: 1600, shine: 2200, info: 2800, done: 4200 }

    const timers = [
      setTimeout(() => setPhase(PHASES.FLIP), timings.enter),
      setTimeout(() => setPhase(PHASES.REVEAL), timings.flip),
      setTimeout(() => setPhase(PHASES.SHINE), timings.reveal),
      setTimeout(() => setPhase(PHASES.INFO), timings.shine),
      setTimeout(() => setPhase(PHASES.DONE), timings.info),
      setTimeout(() => {
        rewardLog.info('reveal finished', { figureId: figure?.id })
        onCompleteRef.current?.()
      }, timings.done),
    ]

    return () => timers.forEach(clearTimeout)
  }, [figure?.id, reduced])

  const photoRevealed = phase !== PHASES.ENTER && phase !== PHASES.FLIP

  return (
    <div className="safe-top safe-bottom relative flex h-full flex-col items-center justify-center overflow-hidden bg-[#0a0a0b] px-6">
      {/* Cinematic vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.7) 100%)',
        }}
        aria-hidden
      />

      <ParticleLayer
        rareza={figure.rareza}
        intensity={phase === PHASES.REVEAL || phase === PHASES.SHINE ? 1.2 : 0.6}
        className="z-0"
      />

      {/* Label */}
      <m.p
        initial={{ opacity: 0, y: -20, letterSpacing: '0.3em' }}
        animate={{ opacity: 1, y: 0, letterSpacing: '0.2em' }}
        transition={{ duration: 0.6, ease: motionTokens.ease.premium }}
        className={`${typeClasses.micro} relative z-10 mb-8 text-lime-400`}
      >
        ✦ Nueva figurita ✦
      </m.p>

      {/* Card flip */}
      <m.div
        initial={
          reduced
            ? { opacity: 0, scale: 0.9 }
            : { rotateY: 180, scale: 0.6, opacity: 0 }
        }
        animate={
          phase === PHASES.ENTER
            ? reduced
              ? { opacity: 0.5, scale: 0.95 }
              : { rotateY: 120, scale: 0.75, opacity: 0.6 }
            : {
                rotateY: 0,
                scale: 1,
                opacity: 1,
              }
        }
        transition={{
          duration: reduced ? 0.4 : motionTokens.duration.cardFlip,
          ease: motionTokens.ease.premium,
        }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative z-10"
      >
        <PremiumRewardCard
          figure={figure}
          photoUrl={photoUrl}
          revealed={photoRevealed}
        />
      </m.div>

      {/* Flash on photo reveal */}
      {phase === PHASES.REVEAL && !reduced && (
        <m.div
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 z-20 bg-white"
          aria-hidden
        />
      )}

      {/* Info below card */}
      <m.div
        initial={{ opacity: 0, y: 24 }}
        animate={
          phase === PHASES.INFO || phase === PHASES.DONE
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 24 }
        }
        transition={{ duration: 0.5, ease: motionTokens.ease.out }}
        className="relative z-10 mt-10 max-w-xs text-center"
      >
        <h2 className={`${typeClasses.headline} text-xl text-warm-white`}>
          {figure.nombre}
        </h2>
        <p
          className="mt-2 font-body text-sm leading-relaxed"
          style={{ color: rarity.colors.primary }}
        >
          {rarity.label} · Colección San Fernando
        </p>
      </m.div>
    </div>
  )
}
