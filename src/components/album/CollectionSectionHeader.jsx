import { memo } from 'react'
import { COLLECTION_STATUS } from '../../config/albumCollections'

const STATUS_LABELS = {
  [COLLECTION_STATUS.INCOMPLETE]: 'En curso',
  [COLLECTION_STATUS.ALMOST_COMPLETE]: 'Casi completa',
  [COLLECTION_STATUS.COMPLETED]: 'Completada',
}

const STATUS_STYLES = {
  [COLLECTION_STATUS.INCOMPLETE]: 'bg-black/[0.04] text-muted',
  [COLLECTION_STATUS.ALMOST_COMPLETE]: 'bg-amber-400/15 text-amber-900/80',
  [COLLECTION_STATUS.COMPLETED]: 'bg-progress/15 text-ink',
}

function CollectionSectionHeaderInner({ progress, variant = 'main' }) {
  const { collection, obtained, total, percent, status } = progress
  const isBonus = variant === 'bonus'

  return (
    <div
      className={`collection-section-header mb-3 rounded-[1.25rem] border px-3.5 py-3 ${
        isBonus
          ? 'border-amber-200/15 bg-charcoal/75'
          : 'border-black/[0.05] bg-white/70 backdrop-blur-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none" aria-hidden>
              {collection.icon}
            </span>
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

        <div className="shrink-0 text-right">
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
              isBonus
                ? status === COLLECTION_STATUS.COMPLETED
                  ? 'bg-progress/20 text-progress'
                  : 'bg-amber-300/10 text-amber-100/70'
                : STATUS_STYLES[status]
            }`}
          >
            {STATUS_LABELS[status]}
          </span>
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
        <div
          className={`collection-progress-fill h-full rounded-full transition-[width] duration-500 ease-out ${
            status === COLLECTION_STATUS.COMPLETED ? 'bg-progress' : isBonus ? 'bg-amber-300/80' : 'bg-progress/85'
          }`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  )
}

export const CollectionSectionHeader = memo(CollectionSectionHeaderInner)
