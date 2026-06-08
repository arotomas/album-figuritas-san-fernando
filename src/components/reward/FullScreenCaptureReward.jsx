import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { m } from 'framer-motion'
import { getRarity } from '../../theme/rarity'
import { motion as motionTokens } from '../../theme/motion'
import { typeClasses } from '../../theme/typography'
import {
  FULLSCREEN_REWARD_MS,
  POINTS_BURST_REVEAL_DELAY_MS,
} from '../../config/captureFeel'
import { playGameSound } from '../../services/audio'
import { ParticleLayer } from '../ui/ParticleLayer'
import { prefersReducedMotion } from '../../utils/performance'
import { rewardLog } from '../../utils/devLog'
import { capturePipelineTrace, traceMounted } from '../../utils/capturePipelineTrace'
import {
  resolveFigurePointsFromCatalog,
  shouldShowPointsBurst,
  getPointsBurstBlockReason,
  logPointsBurst,
} from '../../utils/figurePoints'
import { usePlayerPointsStore } from '../../store/usePlayerPointsStore'

function getRewardRarityBadgeClass(rareza) {
  const rarity = getRarity(rareza)
  if (rarity.id === 'común') {
    return 'bg-gradient-to-r from-progress to-progress-dark text-white shadow-[0_0_16px_rgba(140,198,63,0.35)]'
  }
  return `${rarity.tailwind.badge} text-white`
}

export function FullScreenCaptureReward({ figure, photoUrl, onComplete }) {
  const [visible, setVisible] = useState(false)
  const rarity = getRarity(figure?.rareza)
  const reduced = prefersReducedMotion()
  const onCompleteRef = useRef(onComplete)
  const mountedRef = useRef(true)
  const pointsBurstTriggeredRef = useRef(false)
  const ganarPuntosSoundPlayedRef = useRef(false)

  const pointsEarned = useMemo(
    () => resolveFigurePointsFromCatalog(figure),
    [figure],
  )
  const showPoints = useMemo(
    () => shouldShowPointsBurst(figure) && pointsEarned > 0,
    [figure, pointsEarned],
  )

  useEffect(() => {
    mountedRef.current = true
    traceMounted('FullScreenCaptureReward', true)
    capturePipelineTrace('CAPTURE', 'reward mount', {
      figureId: figure?.id ?? null,
      rareza: figure?.rareza ?? null,
    })
    return () => {
      mountedRef.current = false
      traceMounted('FullScreenCaptureReward', false)
      capturePipelineTrace('CAPTURE', 'reward unmount', {
        figureId: figure?.id ?? null,
      })
    }
  }, [figure?.id, figure?.rareza])

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const triggerPointsBurst = useCallback(() => {
    const blockReason = getPointsBurstBlockReason(figure)
    const show = blockReason == null && pointsEarned > 0

    logPointsBurst({
      phase: 'reward-fullscreen',
      show,
      points: pointsEarned,
      figureId: figure?.id ?? null,
      isQa: Boolean(figure?.isQaTest),
      isRetake: false,
      wasFirstUnlock: !pointsBurstTriggeredRef.current,
      overlayMounted: pointsBurstTriggeredRef.current,
      reason: blockReason ?? (show ? 'triggered' : 'blocked'),
    })

    if (!show || pointsBurstTriggeredRef.current) return

    pointsBurstTriggeredRef.current = true
    usePlayerPointsStore.getState().bumpOptimistic(pointsEarned)
  }, [figure, pointsEarned])

  useEffect(() => {
    pointsBurstTriggeredRef.current = false
    ganarPuntosSoundPlayedRef.current = false
    setVisible(false)
    const revealTimer = window.setTimeout(() => setVisible(true), 60)
    return () => window.clearTimeout(revealTimer)
  }, [figure?.id])

  useEffect(() => {
    if (!visible || !showPoints || ganarPuntosSoundPlayedRef.current) {
      return undefined
    }

    const delayMs = reduced
      ? POINTS_BURST_REVEAL_DELAY_MS.reduced
      : POINTS_BURST_REVEAL_DELAY_MS.full

    const soundTimer = window.setTimeout(() => {
      if (!mountedRef.current || ganarPuntosSoundPlayedRef.current) return
      ganarPuntosSoundPlayedRef.current = true
      playGameSound('GANAR_PUNTOS')
    }, delayMs)

    return () => window.clearTimeout(soundTimer)
  }, [figure?.id, reduced, showPoints, visible])

  useEffect(() => {
    if (!visible) return undefined

    rewardLog.info('fullscreen reward started', { figureId: figure?.id })
    triggerPointsBurst()

    const timings = reduced ? FULLSCREEN_REWARD_MS.reduced : FULLSCREEN_REWARD_MS.full
    const completeTimer = window.setTimeout(() => {
      if (!mountedRef.current) return
      rewardLog.info('fullscreen reward finished', { figureId: figure?.id })
      capturePipelineTrace('CAPTURE', 'reward complete callback', {
        figureId: figure?.id ?? null,
      })
      onCompleteRef.current?.()
    }, timings.hold)

    return () => window.clearTimeout(completeTimer)
  }, [figure?.id, reduced, triggerPointsBurst, visible])

  if (!figure) {
    return (
      <div className="safe-top safe-bottom flex h-full items-center justify-center bg-warm-white px-6 text-center">
        <p className="font-body text-sm text-muted">Cargando recompensa…</p>
      </div>
    )
  }

  const rarityLabel = rarity.label.toUpperCase()
  const particleIntensity = rarity.tier >= 3 ? 0.75 : rarity.tier >= 2 ? 0.5 : 0.35

  return (
    <div className="safe-top safe-bottom relative h-full overflow-hidden bg-warm-white">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={figure.nombre}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-neutral-200" aria-hidden />
      )}

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/55"
        aria-hidden
      />

      {rarity.tier >= 2 && (
        <ParticleLayer
          rareza={figure.rareza}
          intensity={particleIntensity}
          className="z-[1]"
        />
      )}

      <m.div
        initial={{ opacity: 0, y: 18 }}
        animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
        transition={{ duration: reduced ? 0.28 : 0.55, ease: motionTokens.ease.premium }}
        className="relative z-10 flex h-full flex-col items-center justify-start px-6 pt-10 text-center"
      >
        <span
          className={`${typeClasses.micro} mb-4 inline-flex rounded-md px-3 py-1.5 font-bold uppercase tracking-[0.14em] ${getRewardRarityBadgeClass(figure.rareza)}`}
        >
          {rarityLabel}
        </span>

        <h1 className="max-w-[18rem] text-[1.75rem] font-black leading-tight tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] sm:max-w-xs sm:text-3xl">
          {figure.nombre}
        </h1>

        <p
          className={`${typeClasses.micro} mt-5 rounded-full border border-progress/40 bg-progress/15 px-4 py-2 font-bold uppercase tracking-[0.2em] text-progress shadow-[0_0_20px_rgba(140,198,63,0.2)]`}
        >
          ¡Nueva figu!
        </p>

        {showPoints && (
          <m.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={visible ? { opacity: 1, scale: 1 } : {}}
            transition={{
              duration: 0.4,
              delay:
                (reduced
                  ? POINTS_BURST_REVEAL_DELAY_MS.reduced
                  : POINTS_BURST_REVEAL_DELAY_MS.full) / 1000,
              ease: motionTokens.ease.premium,
            }}
            className="mt-6"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/85 drop-shadow-md">
              ¡Ganaste!
            </p>
            <p className="mt-1 text-4xl font-black tracking-tight text-progress drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] sm:text-5xl">
              +{pointsEarned} pts
            </p>
          </m.div>
        )}
      </m.div>
    </div>
  )
}
