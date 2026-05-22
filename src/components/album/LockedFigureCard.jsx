import { memo } from 'react'
import { getRarity } from '../../theme/rarity'
import { albumClasses } from '../../theme/album'
import { RarityBadge } from '../ui/RarityBadge'
import { typeClasses } from '../../theme/typography'
import { prefersReducedMotion } from '../../utils/performance'

function LockedFigureCardInner({
  figure,
  variant = 'featured',
  className = '',
}) {
  const rarity = getRarity(figure.rareza)
  const isFeatured = variant === 'featured'
  const reduced = prefersReducedMotion()

  return (
    <div
      className={`album-locked relative overflow-hidden ${isFeatured ? 'aspect-[4/5]' : 'aspect-[3/4]'} ${className}`}
    >
      {/* Partial rarity frame — teasing what's hidden */}
      <div
        className={`absolute inset-0 opacity-30 ${rarity.tailwind.frame}`}
        aria-hidden
      />
      <div className={`absolute inset-x-0 top-0 h-1 ${rarity.tailwind.accent} opacity-40`} />

      {/* Silhouette / emoji ghost */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`select-none opacity-[0.18] grayscale ${isFeatured ? 'text-[7rem]' : 'text-5xl'}`}
          aria-hidden
        >
          {figure.emoji}
        </span>
      </div>

      {/* Holographic broken overlay */}
      <div
        className={`album-holographic pointer-events-none absolute inset-0 ${reduced ? 'opacity-30' : ''}`}
        aria-hidden
      />

      {/* Premium blur veil */}
      <div className="album-locked-veil absolute inset-0 backdrop-blur-[6px]" />

      {/* Mystery mark */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
        <div
          className={`flex items-center justify-center rounded-full border border-white/25 bg-black/20 backdrop-blur-sm ${
            isFeatured ? 'h-16 w-16' : 'h-10 w-10'
          }`}
        >
          <span
            className={`font-display font-bold text-white/70 ${isFeatured ? 'text-3xl' : 'text-xl'}`}
          >
            ?
          </span>
        </div>

        {isFeatured && (
          <>
            <p className={`${typeClasses.micro} mt-2 text-white/50`}>
              Por descubrir
            </p>
            <p className={`${albumClasses.featuredDescription} max-w-[220px] text-white/45`}>
              Desbloqueá más figuritas explorando San Fernando
            </p>
          </>
        )}
      </div>

      {/* Partial rarity badge — visible through the veil */}
      <div className={`absolute ${isFeatured ? 'left-4 top-4' : 'left-2 top-2'} opacity-60`}>
        <RarityBadge rareza={figure.rareza} size={isFeatured ? 'md' : 'sm'} />
      </div>

      {/* Slow shimmer */}
      {!reduced && <div className="album-locked-shimmer pointer-events-none absolute inset-0" aria-hidden />}
    </div>
  )
}

export const LockedFigureCard = memo(LockedFigureCardInner)
