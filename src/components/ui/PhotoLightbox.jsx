import { useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { FaXmark } from 'react-icons/fa6'

export function PhotoLightbox({ photo, title, open, onClose }) {
  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && photo && (
        <m.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar foto"
            className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm"
          >
            <FaXmark size={18} />
          </button>

          <m.img
            src={photo}
            alt={title ?? 'Foto ampliada'}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="max-h-[88dvh] w-full max-w-3xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </m.div>
      )}
    </AnimatePresence>
  )
}
