import { useEffect, useRef } from 'react'
import { m } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { getMainProgressState } from '../../utils/figureGameRules'
import { UNLOCK_SEQUENCE_MS } from '../../config/captureFeel'
import { motion as motionTokens } from '../../theme/motion'
import { typeClasses } from '../../theme/typography'
import { ParticleLayer } from '../ui/ParticleLayer'
import { vibrateUnlock } from '../../utils/vibration'
import { rewardLog } from '../../utils/devLog'

export function UnlockAnimation({ onComplete }) {
  const figures = useAppStore((state) => state.figures)
  const mainProgress = getMainProgressState(figures)
  const progress = mainProgress.obtained
  const totalFigures = mainProgress.visibleTotal
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    rewardLog.info('unlock animation started')
    const hapticTimer = window.setTimeout(() => vibrateUnlock(), 90)
    const timer = window.setTimeout(() => {
      rewardLog.info('unlock animation finished')
      onCompleteRef.current?.()
    }, UNLOCK_SEQUENCE_MS)

    return () => {
      window.clearTimeout(hapticTimer)
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <div className="safe-top safe-bottom relative flex h-full flex-col items-center justify-center overflow-hidden bg-[#0a0a0b] px-8 text-center">
      <ParticleLayer rareza="épica" intensity={0.45} />

      <m.div
        aria-hidden
        initial={{ scale: 0.6, opacity: 0.5 }}
        animate={{ scale: [0.6, 1.35, 1.5], opacity: [0.45, 0.22, 0] }}
        transition={{ duration: 1.1, ease: motionTokens.ease.out }}
        className="pointer-events-none absolute left-1/2 top-[38%] h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-progress/25"
      />

      <m.div
        aria-hidden
        animate={{ opacity: [0.14, 0.24, 0.14], scale: [1, 1.04, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(140,198,63,0.16),transparent_58%)]"
      />

      <m.div
        initial={{ scale: 0.74, opacity: 0, rotate: -6, y: 24 }}
        animate={{ scale: 1, opacity: 1, rotate: 0, y: 0 }}
        transition={{ ...motionTokens.spring.gentle, delay: 0.08 }}
        className="reward-pack relative z-10 mb-7 flex h-36 w-52 items-center justify-center rounded-[1.75rem] border border-progress/30 bg-gradient-to-br from-progress via-[#b8dc77] to-[#25320f] shadow-[0_22px_60px_rgba(140,198,63,0.2)]"
      >
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/35" />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/25" />
        <span className="text-5xl drop-shadow-md">✨</span>
      </m.div>

      <m.h1
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.5, ease: motionTokens.ease.premium }}
        className={`${typeClasses.display} relative z-10 text-2xl text-warm-white`}
      >
        ¡Nueva figurita!
      </m.h1>
      <m.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.45, ease: motionTokens.ease.out }}
        className={`${typeClasses.label} relative z-10 mt-3 rounded-full border border-progress/30 bg-progress/10 px-4 py-2 text-progress`}
      >
        Se abrió un nuevo slot del álbum
      </m.p>

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42, duration: 0.48, ease: motionTokens.ease.out }}
        className="relative z-10 mt-10 w-full max-w-xs"
      >
        <p className={`${typeClasses.label} mb-4 text-white/40`}>Tu progreso</p>

        <div className="flex items-center gap-3">
          <div className="flex flex-1 gap-1">
            {Array.from({ length: totalFigures }).map((_, index) => (
              <m.div
                key={index}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.52 + index * 0.06, ease: motionTokens.ease.snap }}
                className={`h-3 flex-1 rounded-sm ${
                  index < progress ? 'bg-progress' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <span className="font-display min-w-10 text-sm font-bold text-progress">
            {progress}/{totalFigures}
          </span>
        </div>
      </m.div>

      <m.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.95 }}
        className="relative z-10 mt-8 font-body text-xs text-white/35"
      >
        Yendo a tu álbum…
      </m.p>
    </div>
  )
}
