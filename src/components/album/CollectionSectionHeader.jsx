import { memo } from 'react'
import { m } from 'framer-motion'
import { FaChevronRight } from 'react-icons/fa6'
import { COLLECTION_STATUS } from '../../config/albumCollections'
import {
  COLLECTION_STATUS_LABELS,
  getCollectionStatusTheme,
} from '../../theme/collectionStatus'

function CollectionSectionHeaderInner({
  progress,
  variant = 'main',
  onOpen,
  countdownLabel = null,
  eventBadge = null,
  archived = false,
}) {
  const { collection, obtained, total, percent, status } = progress
  const isBonus = variant === 'bonus'
  const isEvent = variant === 'event'
  const theme = getCollectionStatusTheme(status)
  const interactive = typeof onOpen === 'function'
  const coverImage = collection.coverImage ?? collection.cover_image ?? null

  const titleClass = isEvent
    ? archived
      ? 'text-white/55'
      : 'text-sky-50/95'
    : isBonus
      ? 'text-amber-50/90'
      : 'text-ink/85'

  const descriptionClass = isEvent
    ? archived
      ? 'text-white/35'
      : 'text-sky-100/45'
    : isBonus
      ? 'text-white/45'
      : 'text-muted'

  const content = (
    <>
      {isEvent && coverImage && !archived && (
        <div className="mb-3 overflow-hidden rounded-xl border border-sky-200/15">
          <img
            src={coverImage}
            alt=""
            loading="lazy"
            className="h-24 w-full object-cover opacity-90"
          />
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <m.span
              className="text-lg leading-none"
              aria-hidden
              animate={
                isEvent && !archived
                  ? { scale: [1, 1.04, 1], opacity: [0.88, 1, 0.88] }
                  : theme.pulse
                    ? { scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }
                    : undefined
              }
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              {collection.icon}
            </m.span>
            <h3 className={`font-display text-sm font-black uppercase tracking-wide ${titleClass}`}>
              {collection.label}
            </h3>
            {isEvent && (eventBadge || countdownLabel) && (
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                  archived
                    ? 'bg-white/8 text-white/40'
                    : 'border border-sky-200/20 bg-sky-300/10 text-sky-100/85'
                }`}
              >
                {countdownLabel ?? eventBadge ?? 'Evento'}
              </span>
            )}
          </div>
          {collection.description && (
            <p className={`mt-1 line-clamp-2 text-[11px] leading-snug ${descriptionClass}`}>
              {collection.description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-start gap-2">
          <div className="text-right">
            <p
              className={`text-sm font-black tabular-nums ${
                isEvent ? (archived ? 'text-white/45' : 'text-sky-50') : isBonus ? 'text-amber-100' : 'text-ink'
              }`}
            >
              {obtained}
              <span
                className={
                  isEvent
                    ? 'font-normal text-white/35'
                    : isBonus
                      ? 'font-normal text-white/45'
                      : 'font-normal text-muted'
                }
              >
                {' '}
                / {total}
              </span>
            </p>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                isEvent
                  ? archived
                    ? 'bg-white/8 text-white/40'
                    : 'bg-sky-300/10 text-sky-100/75'
                  : isBonus && status !== COLLECTION_STATUS.COMPLETED
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
              className={`mt-1 ${
                isEvent ? 'text-white/30' : isBonus ? 'text-white/35' : 'text-muted/70'
              }`}
              aria-hidden
            />
          )}
        </div>
      </div>

      <div
        className={`mt-2.5 h-1 overflow-hidden rounded-full ${
          isEvent ? 'bg-white/10' : isBonus ? 'bg-white/10' : 'bg-border/55'
        }`}
        role="progressbar"
        aria-valuenow={obtained}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${collection.label}: ${obtained} de ${total}`}
      >
        <m.div
          layout
          className={`collection-progress-fill h-full rounded-full ${
            isEvent ? (archived ? 'bg-white/20' : 'bg-sky-300/70') : theme.progress
          }`}
          style={{ width: `${Math.min(100, percent)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </>
  )

  const className = `collection-section-header mb-3 rounded-[1.25rem] border px-3.5 py-3 transition ${
    isEvent
      ? archived
        ? 'border-white/8 bg-charcoal/55 opacity-80'
        : 'border-sky-200/20 bg-charcoal/82 shadow-[0_0_32px_rgba(56,189,248,0.08)]'
      : isBonus
        ? 'border-amber-200/15 bg-charcoal/75'
        : `${theme.header} backdrop-blur-sm`
  } ${interactive ? 'cursor-pointer active:scale-[0.995]' : ''}`

  const style =
    isEvent && !archived
      ? { boxShadow: '0 0 28px rgba(56,189,248,0.12)' }
      : !isBonus && !isEvent && theme.glow !== 'none'
        ? { boxShadow: theme.glow }
        : undefined

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
