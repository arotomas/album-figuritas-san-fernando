import { useEffect, useMemo, useRef, useState } from 'react'
import { m } from 'framer-motion'
import { getRarity } from '../../theme/rarity'
import { motion as motionTokens } from '../../theme/motion'
import { typeClasses } from '../../theme/typography'
import { REWARD_TIMINGS } from '../../config/captureFeel'
import { ParticleLayer } from '../ui/ParticleLayer'
import { PremiumRewardCard } from './PremiumRewardCard'
import { RarityDiscoveryBeat } from './RarityDiscoveryBeat'
import { prefersReducedMotion } from '../../utils/performance'
import { rewardLog } from '../../utils/devLog'
import {
  getRarityDiscoveryBeatMs,
  isSpecialRarityDiscovery,
} from '../../utils/rarityDiscovery'
import { vibrateRarityDiscovery } from '../../utils/vibration'

const PHASES = {
  DISCOVERY: 'discovery',
  ENTER: 'enter',
  FLIP: 'flip',
  REVEAL: 'reveal',
  SHINE: 'shine',
  INFO: 'info',
  DONE: 'done',
}

function MiniConfetti({ rareza }) {
  const rarity = getRarity(rareza)
  if (rarity.tier < 3) return null

  const count = Math.min(8, Math.max(4, Math.round(rarity.animation?.particleCount ?? 6) * 0.5))

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          className="reward-confetti absolute rounded-sm"
          style={{
            left: `${8 + ((index * 31) % 84)}%`,
            top: `${12 + ((index * 17) % 22)}%`,
            width: 4 + (index % 3),
            height: 7 + (index % 2) * 3,
            background: index % 4 === 0 ? '#8cc63f' : rarity.colors.particle,
            animationDelay: `${index * 0.04}s`,
          }}
        />
      ))}
    </div>
  )
}

export function CardRevealSequence({ figure, photoUrl, onComplete }) {
  const [phase, setPhase] = useState(PHASES.ENTER)
  const [visible, setVisible] = useState(false)
  const rarity = getRarity(figure?.rareza)
  const reduced = prefersReducedMotion()
  const onCompleteRef = useRef(onComplete)
  const discoveryPlayedRef = useRef(false)

  const isSpecial = useMemo(
    () => isSpecialRarityDiscovery(figure?.rareza),
    [figure?.rareza],
  )
  const discoveryBeatMs = useMemo(
    () => (isSpecial ? getRarityDiscoveryBeatMs(figure?.rareza, { reduced }) : 0),
    [figure?.rareza, isSpecial, reduced],
  )

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    discoveryPlayedRef.current = false
    setPhase(isSpecial ? PHASES.DISCOVERY : PHASES.ENTER)
    setVisible(false)
    const revealTimer = window.setTimeout(() => setVisible(true), 80)
    return () => window.clearTimeout(revealTimer)
  }, [figure?.id, isSpecial])

  useEffect(() => {
    if (!visible) return undefined

    if (isSpecial && !discoveryPlayedRef.current) {
      discoveryPlayedRef.current = true
      vibrateRarityDiscovery(figure?.rareza)
      rewardLog.info('rarity discovery beat', {
        figureId: figure?.id,
        rareza: figure?.rareza,
      })
    }

    rewardLog.info('reveal started', { figureId: figure?.id, isSpecial })
    const timings = reduced ? REWARD_TIMINGS.reduced : REWARD_TIMINGS.full
    const offset = discoveryBeatMs

    const timers = [
      ...(isSpecial
        ? [window.setTimeout(() => setPhase(PHASES.ENTER), offset)]
        : []),
      window.setTimeout(() => setPhase(PHASES.FLIP), offset + timings.enter),
      window.setTimeout(() => setPhase(PHASES.REVEAL), offset + timings.flip),
      window.setTimeout(() => setPhase(PHASES.SHINE), offset + timings.reveal),
      window.setTimeout(() => setPhase(PHASES.INFO), offset + timings.shine),
      window.setTimeout(() => setPhase(PHASES.DONE), offset + timings.info),
      window.setTimeout(() => {
        rewardLog.info('reveal finished', { figureId: figure?.id })
        onCompleteRef.current?.()
      }, offset + timings.done),
    ]

    return () => timers.forEach(clearTimeout)
  }, [discoveryBeatMs, figure?.id, figure?.rareza, isSpecial, reduced, visible])

  if (!figure) {
    return (
      <div className="safe-top safe-bottom flex h-full items-center justify-center bg-[#0a0a0b] px-6 text-center">
        <p className="font-body text-sm text-white/70">Cargando recompensa…</p>
      </div>
    )
  }

  const showDiscovery = phase === PHASES.DISCOVERY
  const showCardSequence = phase !== PHASES.DISCOVERY
  const photoRevealed = phase !== PHASES.ENTER && phase !== PHASES.FLIP && phase !== PHASES.DISCOVERY
  const particleIntensity =
    rarity.tier >= 3 ? 0.85 : rarity.tier >= 2 ? 0.62 : 0.65

  return (
    <div
      className="safe-top safe-bottom relative flex h-full flex-col items-center justify-center overflow-hidden bg-[#0a0a0b] px-6"
      style={
        isSpecial
          ? {
              background: `radial-gradient(ellipse at 50% 32%, ${rarity.colors.glow} 0%, #0a0a0b 68%)`,
              opacity: 0.92,
            }
          : undefined
      }
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.7) 100%)',
        }}
        aria-hidden
      />

      {showDiscovery && (
        <RarityDiscoveryBeat figure={figure} visible={visible} />
      )}

      {showCardSequence && (
        <>
          <ParticleLayer
            rareza={figure.rareza}
            intensity={
              phase === PHASES.REVEAL || phase === PHASES.SHINE
                ? particleIntensity
                : particleIntensity * 0.45
            }
            className="z-0"
          />
          {rarity.tier >= 3 &&
            (phase === PHASES.REVEAL || phase === PHASES.SHINE) && (
            <MiniConfetti rareza={figure.rareza} />
          )}

          <m.p
            initial={{ opacity: 0, y: -16, letterSpacing: '0.28em' }}
            animate={visible ? { opacity: 1, y: 0, letterSpacing: '0.18em' } : {}}
            transition={{ duration: 0.55, delay: 0.05, ease: motionTokens.ease.premium }}
            className={`${typeClasses.micro} relative z-10 mb-5 rounded-full border px-4 py-2 ${
              isSpecial
                ? ''
                : 'border-progress/25 bg-progress/10 text-progress shadow-[0_0_20px_rgba(140,198,63,0.14)]'
            }`}
            style={
              isSpecial
                ? {
                    color: rarity.colors.primary,
                    borderColor: `${rarity.colors.primary}38`,
                    backgroundColor: `${rarity.colors.glow}10`,
                  }
                : undefined
            }
          >
            {isSpecial ? `Rareza ${rarity.label}` : '¡Nueva figurita!'}
          </m.p>

          <m.div
            initial={{ opacity: 0, y: 20, scale: 0.88 }}
            animate={
              visible
                ? {
                    opacity: phase === PHASES.ENTER ? 1 : 0,
                    y: phase === PHASES.ENTER ? 0 : -14,
                    scale: phase === PHASES.ENTER ? 1 : 1.06,
                  }
                : { opacity: 0 }
            }
            transition={{ duration: 0.42, delay: 0.12, ease: motionTokens.ease.premium }}
            className={`reward-pack relative z-10 mb-5 flex h-28 w-44 items-center justify-center rounded-[1.4rem] border bg-gradient-to-br shadow-[0_18px_50px_rgba(0,0,0,0.18)] ${
              isSpecial
                ? `${rarity.tailwind.border} ${rarity.tailwind.gradient}`
                : 'border-progress/30 from-progress via-[#b8dc77] to-[#314313]'
            }`}
          >
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/35" />
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/25" />
            <span
              className={`${typeClasses.micro} relative z-10 rounded-full bg-ink px-3 py-1`}
              style={{ color: isSpecial ? rarity.colors.primary : undefined }}
            >
              {isSpecial ? rarity.label : 'Pack SF'}
            </span>
          </m.div>

          <m.div
            initial={
              reduced
                ? { opacity: 0, scale: 0.9 }
                : { rotateY: 180, scale: 0.62, opacity: 0 }
            }
            animate={
              !visible
                ? { opacity: 0 }
                : phase === PHASES.ENTER
                  ? reduced
                    ? { opacity: 0.5, scale: 0.95 }
                    : { rotateY: 120, scale: 0.76, opacity: 0.65 }
                  : {
                      rotateY: 0,
                      scale: 1,
                      opacity: 1,
                    }
            }
            transition={{
              duration: reduced ? 0.38 : 1.25,
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

          {phase === PHASES.REVEAL && !reduced && (
            <m.div
              initial={{ opacity: 0.85 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-0 z-20 bg-white"
              aria-hidden
            />
          )}

          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={
              phase === PHASES.INFO || phase === PHASES.DONE
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 20 }
            }
            transition={{ duration: 0.48, ease: motionTokens.ease.out }}
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
        </>
      )}
    </div>
  )
}
