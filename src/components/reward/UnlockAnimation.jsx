import { useEffect, useRef } from 'react'
import { m } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { getMainProgressState } from '../../utils/figureGameRules'
import { motion as motionTokens } from '../../theme/motion'
import { typeClasses } from '../../theme/typography'
import { ParticleLayer } from '../ui/ParticleLayer'
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
    const timer = setTimeout(() => {
      rewardLog.info('unlock animation finished')
      onCompleteRef.current?.()
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="safe-top safe-bottom relative flex h-full flex-col items-center justify-center overflow-hidden bg-[#0a0a0b] px-8 text-center">
      <ParticleLayer rareza="épica" intensity={0.5} />

      <m.div
        initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={motionTokens.spring.gentle}
        className="relative z-10 mb-6 text-5xl"
      >
        ✨
      </m.div>

      <m.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, ease: motionTokens.ease.premium }}
        className={`${typeClasses.display} relative z-10 text-2xl text-warm-white`}
      >
        ¡Hay una nueva figurita desbloqueada!
      </m.h1>

      <m.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, ease: motionTokens.ease.out }}
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
                transition={{ delay: 0.5 + index * 0.07, ease: motionTokens.ease.snap }}
                className={`h-3 flex-1 rounded-sm ${
                  index < progress
                    ? 'bg-progress'
                    : 'bg-white/10'
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
        transition={{ delay: 1.1 }}
        className="relative z-10 mt-8 font-body text-xs text-white/35"
      >
        Yendo a tu álbum…
      </m.p>
    </div>
  )
}
