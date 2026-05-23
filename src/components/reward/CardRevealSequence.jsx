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

function MiniConfetti({ rareza }) {
  const rarity = getRarity(rareza)
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden>
      {Array.from({ length: 18 }).map((_, index) => (
        <span
          key={index}
          className="reward-confetti absolute rounded-sm"
          style={{
            left: `${8 + ((index * 31) % 84)}%`,
            top: `${12 + ((index * 17) % 22)}%`,
            width: 5 + (index % 3),
            height: 8 + (index % 2) * 4,
            background: index % 4 === 0 ? '#8cc63f' : rarity.colors.particle,
            animationDelay: `${index * 0.035}s`,
          }}
        />
      ))}
    </div>
  )
}

export function CardRevealSequence({ figure, photoUrl, onComplete }) {
  const [phase, setPhase] = useState(PHASES.ENTER)
  const rarity = getRarity(figure?.rareza)
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

  if (!figure) {
    return (
      <div className="safe-top safe-bottom flex h-full items-center justify-center bg-[#0a0a0b] px-6 text-center">
        <p className="font-body text-sm text-white/70">Cargando recompensa…</p>
      </div>
    )
  }

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
      {(phase === PHASES.REVEAL || phase === PHASES.SHINE || phase === PHASES.INFO) && (
        <MiniConfetti rareza={figure.rareza} />
      )}

      {/* Label */}
      <m.p
        initial={{ opacity: 0, y: -20, letterSpacing: '0.3em' }}
        animate={{ opacity: 1, y: 0, letterSpacing: '0.2em' }}
        transition={{ duration: 0.6, ease: motionTokens.ease.premium }}
        className={`${typeClasses.micro} relative z-10 mb-5 rounded-full border border-progress/25 bg-progress/10 px-4 py-2 text-progress shadow-[0_0_24px_rgba(140,198,63,0.16)]`}
      >
        ¡Nueva figurita!
      </m.p>

      <m.div
        initial={{ opacity: 0, y: 24, scale: 0.85 }}
        animate={{
          opacity: phase === PHASES.ENTER ? 1 : 0,
          y: phase === PHASES.ENTER ? 0 : -18,
          scale: phase === PHASES.ENTER ? 1 : 1.08,
        }}
        transition={{ duration: 0.45, ease: motionTokens.ease.premium }}
        className="reward-pack relative z-10 mb-5 flex h-28 w-44 items-center justify-center rounded-[1.4rem] border border-progress/30 bg-gradient-to-br from-progress via-[#b8dc77] to-[#314313] shadow-[0_18px_50px_rgba(140,198,63,0.18)]"
      >
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/35" />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/25" />
        <span className={`${typeClasses.micro} relative z-10 rounded-full bg-ink px-3 py-1 text-progress`}>
          Pack SF
        </span>
      </m.div>

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
          className="mt-2 inline-flex rounded-full border border-white/10 px-4 py-1.5 font-body text-sm font-bold leading-relaxed"
          style={{ color: rarity.colors.primary }}
        >
          Rareza {rarity.label}
        </p>
        <p className="mt-3 font-body text-xs text-white/40">Colección San Fernando</p>
      </m.div>
    </div>
  )
}
