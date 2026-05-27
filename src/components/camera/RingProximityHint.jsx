import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function RingProximityHintInner({ visible, onDismiss }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mt-3 flex max-w-[18rem] flex-col items-center gap-2 px-5 text-center"
        >
          <p className="text-[13px] leading-relaxed text-white/82 drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]">
            El círculo se completa cuando estás cerca.
          </p>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[11px] font-medium text-white/45 underline-offset-2 hover:text-white/65 hover:underline"
          >
            Entendido
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const RingProximityHint = memo(RingProximityHintInner)
