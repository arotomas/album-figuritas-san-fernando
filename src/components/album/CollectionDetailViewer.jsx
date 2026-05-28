import { memo } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { FaXmark } from 'react-icons/fa6'
import {
  COLLECTION_STATUS_LABELS,
  getCollectionStatusTheme,
} from '../../theme/collectionStatus'
import { typeClasses } from '../../theme/typography'
import { RarityBadge } from '../ui/RarityBadge'
import { getRarity } from '../../theme/rarity'
import { LockedFigurePlaceholder } from './LockedFigurePlaceholder'

function CollectionFigureTile({ figure, isNew, onSelect }) {
  const rarity = getRarity(figure.rareza)
  const obtained = Boolean(figure.obtenida)

  return (
    <m.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(figure.id)}
      className={`overflow-hidden rounded-[1.2rem] border text-left ${
        obtained ? 'border-white/12 bg-charcoal/70' : 'border-white/8 bg-black/35'
      }`}
      style={obtained ? { boxShadow: rarity.cssGlow } : undefined}
    >
      <div className={`h-1 ${rarity.tailwind.accent}`} />
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <RarityBadge rareza={figure.rareza} size="sm" />
          {isNew && (
            <span className="rounded-full bg-progress/20 px-2 py-0.5 text-[9px] font-bold uppercase text-progress">
              Nueva
            </span>
          )}
        </div>
        <div className="aspect-[3/4] overflow-hidden rounded-xl border border-white/10 bg-[#6a6a6a]">
          {obtained && figure.foto ? (
            <img
              src={figure.foto}
              alt={figure.nombre}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : !obtained ? (
            <LockedFigurePlaceholder />
          ) : (
            <div className="flex h-full items-center justify-center bg-charcoal text-4xl opacity-80">
              {figure.emoji ?? '📍'}
            </div>
          )}
        </div>
        <p className="mt-2 line-clamp-2 font-display text-sm font-black text-warm-white">
          {figure.nombre}
        </p>
        {!obtained && (
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">
            Sin capturar
          </p>
        )}
      </div>
    </m.button>
  )
}

function CollectionDetailViewerInner({
  group,
  open,
  onClose,
  onSelectFigure,
  lastObtenidaFigureId,
}) {
  if (!group) return null

  const { collection, figures, progress } = group
  const theme = getCollectionStatusTheme(progress.status)

  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="fixed inset-0 z-[175] overflow-y-auto bg-black/90 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Colección ${collection.label}`}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="fixed right-4 top-[calc(0.75rem+env(safe-area-inset-top))] z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white"
          >
            <FaXmark size={18} />
          </button>

          <div className="safe-x mx-auto min-h-full w-full max-w-lg px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(4rem+env(safe-area-inset-top))]">
            <m.header
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-[1.6rem] border border-white/10 px-5 py-5"
              style={{
                boxShadow: theme.glow !== 'none' ? theme.glow : undefined,
                background:
                  'linear-gradient(180deg, rgba(26,26,28,0.96) 0%, rgba(10,10,11,0.98) 100%)',
              }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(140,198,63,0.12),transparent_55%)]" />
              <div className="relative">
                <span className="text-4xl" aria-hidden>
                  {collection.icon}
                </span>
                <p className={`${typeClasses.micro} mt-3 text-white/45`}>Colección</p>
                <h2 className={`${typeClasses.display} mt-1 text-2xl text-warm-white`}>
                  {collection.label}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/55">{collection.description}</p>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-black tabular-nums text-warm-white">
                    {progress.obtained}
                    <span className="font-normal text-white/45"> / {progress.total}</span>
                  </p>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${theme.badge}`}>
                    {COLLECTION_STATUS_LABELS[progress.status]}
                  </span>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <m.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.percent}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={`h-full rounded-full ${theme.progress}`}
                  />
                </div>
              </div>
            </m.header>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {figures.map((figure) => (
                <CollectionFigureTile
                  key={figure.id}
                  figure={figure}
                  isNew={figure.obtenida && figure.id === lastObtenidaFigureId}
                  onSelect={onSelectFigure}
                />
              ))}
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}

export const CollectionDetailViewer = memo(CollectionDetailViewerInner)
