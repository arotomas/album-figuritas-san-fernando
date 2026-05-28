import { memo } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { FaXmark } from 'react-icons/fa6'
import { formatExplorationDistance } from '../../../utils/explorationMap'

function ExplorationDistanceBadgeInner({ visible, targetName, distanceMeters, onExit }) {
  return (
    <AnimatePresence>
      {visible && (
        <m.div
          className="safe-top pointer-events-none absolute inset-x-0 top-[4.5rem] z-[515] flex justify-center px-5"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          role="status"
          aria-live="polite"
        >
          <div className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-full border border-progress/30 bg-zinc-950/82 px-4 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-md">
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-progress/90">
                Modo exploración
              </p>
              <p className="mt-0.5 font-display text-sm font-bold text-white">
                A {formatExplorationDistance(distanceMeters)}
              </p>
              {targetName && (
                <p className="truncate text-[11px] text-white/55">{targetName}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onExit}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white/75 active:scale-95"
              aria-label="Salir del modo exploración"
            >
              <FaXmark size={12} aria-hidden />
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}

export const ExplorationDistanceBadge = memo(ExplorationDistanceBadgeInner)
