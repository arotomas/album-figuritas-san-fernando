import { useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { getRarity } from '../../theme/rarity'
import { typeClasses } from '../../theme/typography'
import { RarityBadge } from '../ui/RarityBadge'
import { PhotoLightbox } from '../ui/PhotoLightbox'
import { FigureChallengeCard } from './FigureChallengeCard'
import { LockedFigureCard } from './LockedFigureCard'

function formatCapturedAt(value) {
  if (!value) return null
  return new Date(value).toLocaleString('es-AR')
}

export function FigureDetailSheet({
  figure,
  open,
  onClose,
  onRetakePhoto,
  onDeletePhoto,
}) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const rarity = getRarity(figure?.rareza ?? figure?.rarity ?? 'común')
  const obtained = Boolean(figure?.obtenida)
  const hasPhoto = Boolean(figure?.foto)

  const handleClose = () => {
    setPreviewOpen(false)
    setConfirmDelete(false)
    onClose?.()
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    onDeletePhoto?.(figure)
    setConfirmDelete(false)
    setPreviewOpen(false)
    onClose?.()
  }

  return (
    <>
      <AnimatePresence>
        {open && figure && (
          <m.div
            className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          >
            <m.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex max-h-[min(92dvh,720px)] w-full max-w-md flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-charcoal shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className={`h-1.5 w-full shrink-0 ${rarity.tailwind.accent}`} />

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
              {obtained ? (
                <div className={`bg-gradient-to-b ${rarity.tailwind.gradient} p-4`}>
                  <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black/25 p-2">
                    {hasPhoto ? (
                      <button
                        type="button"
                        onClick={() => setPreviewOpen(true)}
                        className="group relative block w-full overflow-hidden rounded-xl"
                        aria-label="Ver foto en pantalla completa"
                      >
                        <img
                          src={figure.foto}
                          alt={figure.nombre}
                          className="mx-auto block max-h-[min(58dvh,calc(92dvh-16rem))] w-full object-contain transition duration-300 group-hover:scale-[1.01]"
                        />
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 py-3 text-left text-xs font-semibold text-white/85">
                          Tocá para ampliar
                        </span>
                      </button>
                    ) : (
                      <div className="flex min-h-[40dvh] items-center justify-center text-6xl">
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

              <div className="space-y-3 px-5 py-4">
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
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => onRetakePhoto?.(figure)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-progress px-4 py-3 text-sm font-black text-ink shadow-[0_0_24px_rgba(140,198,63,0.22)]"
                    >
                      <span aria-hidden>📸</span>
                      Mejorar foto
                    </button>

                    {hasPhoto && onDeletePhoto && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        className={`w-full rounded-2xl px-4 py-3 text-sm font-bold transition ${
                          confirmDelete
                            ? 'bg-red-500/90 text-white'
                            : 'border border-red-300/25 bg-red-500/10 text-red-100'
                        }`}
                      >
                        {confirmDelete ? 'Confirmar eliminación' : 'Eliminar foto'}
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white/80"
                >
                  Cerrar
                </button>
              </div>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      <PhotoLightbox
        photo={figure?.foto}
        title={figure?.nombre}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  )
}
