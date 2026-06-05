import { memo } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { FaXmark } from 'react-icons/fa6'
import { formatExplorationDistance } from '../../../utils/explorationMap'

function ExplorationDistanceBadgeInner({
  visible,
  targetName,
  distanceMeters,
  hasUserLocation = false,
  onExit,
}) {
  const distanceLabel = hasUserLocation
    ? `A ${formatExplorationDistance(distanceMeters)}`
    : 'Activá ubicación para ver la ruta'

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          className="safe-top pointer-events-none absolute inset-x-0 top-[5.75rem] z-[600] flex justify-center px-5"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          role="status"
          aria-live="polite"
        >
          <div className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-progress/30 bg-zinc-950/88 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-md">
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-progress/90">
                Modo exploración
              </p>
              {targetName && (
                <p className="mt-1 line-clamp-2 font-display text-base font-black uppercase leading-tight tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] sm:text-lg">
                  {targetName}
                </p>
              )}
              <p
                className={`mt-1 text-xs font-semibold ${
                  hasUserLocation ? 'text-white/75' : 'text-amber-100'
                }`}
              >
                {distanceLabel}
              </p>
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
