import { m, AnimatePresence } from 'framer-motion'
import { getRarity } from '../../theme/rarity'
import { typeClasses } from '../../theme/typography'
import { RarityBadge } from '../ui/RarityBadge'
import { FigureChallengeCard } from './FigureChallengeCard'
import { LockedFigureCard } from './LockedFigureCard'

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
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
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
            className="max-h-[min(92dvh,720px)] w-full max-w-md overflow-y-auto rounded-[1.75rem] border border-white/10 bg-charcoal shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`h-1.5 w-full ${rarity.tailwind.accent}`} />

            {obtained ? (
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
            ) : (
              <div className="p-4">
                <LockedFigureCard figure={figure} variant="featured" className="rounded-2xl" />
              </div>
            )}

            <div className="space-y-4 px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`${typeClasses.micro} text-white/45`}>
                    {obtained ? 'Figurita obtenida' : 'Figurita bloqueada'}
                  </p>
                  <h2 className={`${typeClasses.headline} mt-1 text-xl text-warm-white`}>
                    {obtained ? figure.nombre : '????'}
                  </h2>
                </div>
                <RarityBadge rareza={figure.rareza} size="sm" />
              </div>

              <p className="text-sm font-semibold text-white/70">
                {obtained ? 'Estado: Descubierta' : 'Estado: Bloqueada'}
              </p>

              {obtained && figure.obtenidaEn && (
                <p className="text-sm text-white/55">
                  Capturada: {formatCapturedAt(figure.obtenidaEn)}
                </p>
              )}

              {!obtained && (
                <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white/65">
                  Se revela al avanzar en el álbum
                </p>
              )}

              {obtained && <FigureChallengeCard figure={figure} />}

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
