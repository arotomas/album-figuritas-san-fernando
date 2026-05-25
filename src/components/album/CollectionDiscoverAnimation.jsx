import { useEffect, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { FaXmark } from 'react-icons/fa6'
import { typeClasses } from '../../theme/typography'
import { motion as motionTokens } from '../../theme/motion'
import { vibrateAlbumSwipe } from '../../utils/vibration'

export function CollectionDiscoverAnimation({ collection, open, onComplete }) {
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (!open) return undefined
    vibrateAlbumSwipe()
    const timer = window.setTimeout(() => onCompleteRef.current?.(), 2400)
    return () => window.clearTimeout(timer)
  }, [open])

  return (
    <AnimatePresence>
      {open && collection && (
        <m.div
          className="fixed inset-0 z-[185] flex items-center justify-center bg-black/82 px-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Colección ${collection.label} descubierta`}
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
              initial={{ scale: 0.78, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={motionTokens.spring.gentle}
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-amber-200/25 bg-amber-300/10 shadow-[0_0_40px_rgba(251,191,36,0.18)]"
            >
              <m.span
                animate={{ scale: [1, 1.05, 1], opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="text-4xl"
                aria-hidden
              >
                {collection.icon}
              </m.span>
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, ease: motionTokens.ease.premium }}
              className="mx-auto mt-4 inline-flex rounded-full border border-amber-200/20 bg-charcoal/90 px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100/80"
            >
              Nueva colección
            </m.div>

            <m.h2
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24, ease: motionTokens.ease.premium }}
              className={`${typeClasses.display} mt-4 text-xl text-warm-white`}
            >
              {collection.label}
            </m.h2>

            {collection.description && (
              <m.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.32 }}
                className="mt-2 text-sm leading-6 text-white/50"
              >
                {collection.description}
              </m.p>
            )}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
