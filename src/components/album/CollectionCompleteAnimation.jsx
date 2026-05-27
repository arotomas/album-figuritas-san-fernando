import { useEffect, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { FaXmark } from 'react-icons/fa6'
import { typeClasses } from '../../theme/typography'
import { motion as motionTokens } from '../../theme/motion'
import { vibrateCollectionComplete } from '../../utils/vibration'

export function CollectionCompleteAnimation({ progress, open, onComplete }) {
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (!open) return undefined
    vibrateCollectionComplete()
    const timer = window.setTimeout(() => onCompleteRef.current?.(), 2800)
    return () => window.clearTimeout(timer)
  }, [open])

  const { collection, obtained, total } = progress ?? {}

  if (open && progress && !collection) return null

  return (
    <AnimatePresence>
      {open && progress && collection && (
        <m.div
          className="fixed inset-0 z-[190] flex items-center justify-center bg-black/88 px-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Colección ${collection?.label ?? 'álbum'} completada`}
        >
          <button
            type="button"
            onClick={() => onCompleteRef.current?.()}
            aria-label="Cerrar"
            className="absolute right-4 top-[calc(0.75rem+env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white"
          >
            <FaXmark size={18} />
          </button>

          <div className="relative w-full max-w-sm text-center">
            <m.div
              initial={{ scale: 0.82, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={motionTokens.spring.gentle}
              className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-progress/35 bg-progress/10 shadow-[0_0_48px_rgba(140,198,63,0.22)]"
            >
              <m.span
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="text-5xl"
                aria-hidden
              >
                {collection?.icon ?? '✓'}
              </m.span>
            </m.div>

            <m.div
              initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.18, ...motionTokens.spring.gentle }}
              className="mx-auto -mt-5 inline-flex rounded-full border border-progress/30 bg-charcoal/90 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-progress"
            >
              Sello de colección
            </m.div>

            <m.h2
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, ease: motionTokens.ease.premium }}
              className={`${typeClasses.display} mt-5 text-2xl text-warm-white`}
            >
              Colección completada
            </m.h2>

            <m.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36, ease: motionTokens.ease.out }}
              className="mt-2 font-display text-lg text-progress"
            >
              {collection.label}
            </m.p>

            <m.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.44 }}
              className="mt-3 text-sm leading-6 text-white/55"
            >
              {obtained}/{total} figuritas reunidas en esta colección.
            </m.p>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
