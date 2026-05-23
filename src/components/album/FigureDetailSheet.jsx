import { m, AnimatePresence } from 'framer-motion'
import { getRarity } from '../../theme/rarity'
import { typeClasses } from '../../theme/typography'
import { RarityBadge } from '../ui/RarityBadge'

function formatCapturedAt(value) {
  if (!value) return null
  return new Date(value).toLocaleString('es-AR')
}

export function FigureDetailSheet({ figure, open, onClose, onRetakePhoto }) {
  const rarity = getRarity(figure?.rareza ?? figure?.rarity ?? 'común')
  const obtained = Boolean(figure?.obtenida)

  return (
    <AnimatePresence>
      {open && figure && (
        <m.div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <m.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-charcoal shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`h-1.5 w-full ${rarity.tailwind.accent}`} />

            <div className={`bg-gradient-to-b ${rarity.tailwind.gradient} p-4`}>
              <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black/25 p-2">
                {figure.foto ? (
                  <img
                    src={figure.foto}
                    alt={figure.nombre}
                    className="aspect-[3/4] w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center text-6xl">
                    {figure.emoji ?? '📍'}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`${typeClasses.micro} text-white/45`}>Figurita obtenida</p>
                  <h2 className={`${typeClasses.headline} mt-1 text-xl text-warm-white`}>
                    {figure.nombre}
                  </h2>
                </div>
                <RarityBadge rareza={figure.rareza} size="sm" />
              </div>

              {figure.obtenidaEn && (
                <p className="text-sm text-white/55">
                  Capturada: {formatCapturedAt(figure.obtenidaEn)}
                </p>
              )}

              {obtained && (
                <button
                  type="button"
                  onClick={() => onRetakePhoto?.(figure)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-progress px-4 py-3 text-sm font-black text-ink shadow-[0_0_24px_rgba(140,198,63,0.22)]"
                >
                  <span aria-hidden>📸</span>
                  Mejorar foto
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white/80"
              >
                Cerrar
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
