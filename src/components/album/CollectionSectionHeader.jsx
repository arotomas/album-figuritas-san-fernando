import { memo } from 'react'
import { m } from 'framer-motion'
import { FaChevronRight } from 'react-icons/fa6'
import { COLLECTION_STATUS } from '../../config/albumCollections'
import {
  COLLECTION_STATUS_LABELS,
  getCollectionStatusTheme,
} from '../../theme/collectionStatus'

function CollectionSectionHeaderInner({ progress, variant = 'main', onOpen }) {
  const { collection, obtained, total, percent, status } = progress
  const isBonus = variant === 'bonus'
  const theme = getCollectionStatusTheme(status)
  const interactive = typeof onOpen === 'function'

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <m.span
              className="text-lg leading-none"
              aria-hidden
              animate={
                theme.pulse
                  ? { scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }
                  : undefined
              }
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              {collection.icon}
            </m.span>
            <h3
              className={`font-display text-sm font-black uppercase tracking-wide ${
                isBonus ? 'text-amber-50/90' : 'text-ink/85'
              }`}
            >
              {collection.label}
            </h3>
          </div>
          {collection.description && (
            <p
              className={`mt-1 line-clamp-2 text-[11px] leading-snug ${
                isBonus ? 'text-white/45' : 'text-muted'
              }`}
            >
              {collection.description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-start gap-2">
          <div className="text-right">
            <p
              className={`text-sm font-black tabular-nums ${
                isBonus ? 'text-amber-100' : 'text-ink'
              }`}
            >
              {obtained}
              <span className={isBonus ? 'font-normal text-white/45' : 'font-normal text-muted'}>
                {' '}
                / {total}
              </span>
            </p>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                isBonus && status !== COLLECTION_STATUS.COMPLETED
                  ? 'bg-amber-300/10 text-amber-100/70'
                  : theme.badge
              }`}
            >
              {COLLECTION_STATUS_LABELS[status]}
            </span>
          </div>
          {interactive && (
            <FaChevronRight
              size={12}
              className={`mt-1 ${isBonus ? 'text-white/35' : 'text-muted/70'}`}
              aria-hidden
            />
          )}
        </div>
      </div>

      <div
        className={`mt-2.5 h-1 overflow-hidden rounded-full ${
          isBonus ? 'bg-white/10' : 'bg-border/55'
        }`}
        role="progressbar"
        aria-valuenow={obtained}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${collection.label}: ${obtained} de ${total}`}
      >
        <m.div
          layout
          className={`collection-progress-fill h-full rounded-full ${theme.progress}`}
          style={{ width: `${Math.min(100, percent)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </>
  )

  const className = `collection-section-header mb-3 rounded-[1.25rem] border px-3.5 py-3 transition ${
    isBonus
      ? 'border-amber-200/15 bg-charcoal/75'
      : `${theme.header} backdrop-blur-sm`
  } ${interactive ? 'cursor-pointer active:scale-[0.995]' : ''}`

  const style = !isBonus && theme.glow !== 'none' ? { boxShadow: theme.glow } : undefined

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={`${className} w-full text-left`}
        style={style}
        aria-label={`Abrir colección ${collection.label}`}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={className} style={style}>
      {content}
    </div>
  )
}

export const CollectionSectionHeader = memo(CollectionSectionHeaderInner)
