import { useCallback, useEffect, useRef, useState } from 'react'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { SPLASH_AUTO_COMPLETE_MS, SPLASH_MIN_DISPLAY_MS } from '../../config/splash'
import { motion as motionTokens } from '../../theme/motion'

const ASSETS = {
  background: '/assets/splash/splash-bg.jpg',
  logoMunicipio: '/assets/logos/logo-municipio-white.svg',
  logoAlbum: '/assets/logos/logo-album-white.svg',
}

const introTransition = {
  duration: 1.2,
  ease: [0.22, 1, 0.36, 1],
}

const breathingTransition = {
  duration: 4.8,
  repeat: Infinity,
  ease: 'easeInOut',
}

export function SplashScreen({ onComplete }) {
  const [canContinue, setCanContinue] = useState(false)
  const completedRef = useRef(false)

  const finish = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    onComplete?.()
  }, [onComplete])

  useEffect(() => {
    const minTimer = window.setTimeout(() => setCanContinue(true), SPLASH_MIN_DISPLAY_MS)
    const autoTimer = window.setTimeout(finish, SPLASH_AUTO_COMPLETE_MS)

    return () => {
      window.clearTimeout(minTimer)
      window.clearTimeout(autoTimer)
    }
  }, [finish])

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="splash-screen safe-top safe-bottom fixed inset-0 z-[9000] flex min-h-0 flex-col overflow-hidden bg-black">
        <img
          src={ASSETS.background}
          alt=""
          aria-hidden
          className="pointer-events-none fixed inset-0 h-full w-full object-cover object-center"
          draggable={false}
        />

        <div
          className="pointer-events-none fixed inset-0 bg-black/40"
          aria-hidden
        />

        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/75 via-black/35 to-transparent"
          aria-hidden
        />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
          <m.div
            className="flex w-full max-w-md flex-col items-center"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={introTransition}
          >
            <img
              src={ASSETS.logoMunicipio}
              alt="Municipalidad de San Fernando"
              className="mb-8 h-9 w-auto max-w-[min(72vw,220px)] object-contain opacity-95"
              draggable={false}
            />

            <m.div
              className="flex w-full max-w-[min(88vw,300px)] items-center justify-center"
              animate={{ scale: [1, 1.02, 1] }}
              transition={breathingTransition}
            >
              <img
                src={ASSETS.logoAlbum}
                alt="Álbum Sanfernandino"
                className="h-auto w-full object-contain drop-shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                draggable={false}
              />
            </m.div>

            <m.p
              className="mt-8 max-w-[18rem] text-center font-body text-[15px] font-medium leading-snug tracking-wide text-white/92"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.85, ease: 'easeOut' }}
            >
              Recorré, descubrí y coleccioná San Fernando
            </m.p>
          </m.div>

          <div className="mt-auto w-full max-w-md pt-10">
            <m.button
              type="button"
              onClick={finish}
              disabled={!canContinue}
              whileTap={canContinue ? motionTokens.tap : undefined}
              whileHover={canContinue ? { scale: 1.01 } : undefined}
              transition={motionTokens.spring.soft}
              className={`font-display w-[80%] min-w-[200px] max-w-full rounded-2xl border border-white/20 py-4 text-sm font-semibold uppercase tracking-[0.14em] shadow-[0_10px_32px_rgba(0,0,0,0.28)] transition-[opacity,background-color,transform] duration-300 ${
                canContinue
                  ? 'bg-warm-white text-ink active:scale-[0.98]'
                  : 'cursor-not-allowed bg-white/55 text-ink/45'
              } mx-auto block`}
            >
              Comenzar
            </m.button>
          </div>
        </div>
      </div>
    </LazyMotion>
  )
}
