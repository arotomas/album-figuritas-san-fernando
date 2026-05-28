import { useCallback, useEffect, useRef, useState } from 'react'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { SPLASH_EXIT_FADE_MS, SPLASH_MIN_DISPLAY_MS } from '../../config/splash'
import { motion as motionTokens } from '../../theme/motion'

/** Arte institucional completo (diseño BASE) — sin overlays ni logos extra. */
const SPLASH_ARTWORK = '/assets/splash/splash-screen.png'

const introTransition = {
  duration: 1.2,
  ease: [0.22, 1, 0.36, 1],
}

const exitTransition = {
  duration: SPLASH_EXIT_FADE_MS / 1000,
  ease: [0.22, 1, 0.36, 1],
}

export function SplashScreen({ onComplete }) {
  const [canContinue, setCanContinue] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const completedRef = useRef(false)

  useEffect(() => {
    const minTimer = window.setTimeout(() => setCanContinue(true), SPLASH_MIN_DISPLAY_MS)
    return () => window.clearTimeout(minTimer)
  }, [])

  const handleBegin = useCallback(() => {
    if (!canContinue || completedRef.current || isExiting) return
    completedRef.current = true
    setIsExiting(true)
  }, [canContinue, isExiting])

  const handleExitComplete = useCallback(() => {
    if (!isExiting) return
    onComplete?.()
  }, [isExiting, onComplete])

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        className="splash-screen fixed inset-0 z-[9000] flex min-h-0 flex-col overflow-hidden bg-[#8cc63f]"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{
          opacity: isExiting ? 0 : 1,
          scale: isExiting ? 1 : 1,
        }}
        transition={isExiting ? exitTransition : introTransition}
        onAnimationComplete={handleExitComplete}
        aria-hidden={isExiting}
      >
        <img
          src={SPLASH_ARTWORK}
          alt="Álbum Figuritas de San Fernando"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
          draggable={false}
        />

        <div className="safe-bottom relative z-10 mt-auto flex w-full shrink-0 items-center justify-center px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 min-h-[clamp(3.25rem,12vh,5.5rem)]">
          <m.button
            type="button"
            onClick={handleBegin}
            disabled={!canContinue || isExiting}
            whileTap={canContinue && !isExiting ? motionTokens.tap : undefined}
            whileHover={canContinue && !isExiting ? { scale: 1.01 } : undefined}
            transition={motionTokens.spring.soft}
            className={`font-display mx-auto block w-[80%] min-w-[200px] max-w-sm rounded-2xl border border-white/25 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] shadow-[0_8px_28px_rgba(0,0,0,0.22)] transition-[opacity,background-color,transform] duration-300 ${
              canContinue && !isExiting
                ? 'bg-progress text-white active:scale-[0.98]'
                : 'cursor-not-allowed border-white/15 bg-progress/45 text-white/55'
            }`}
          >
            Comenzar
          </m.button>
        </div>
      </m.div>
    </LazyMotion>
  )
}
