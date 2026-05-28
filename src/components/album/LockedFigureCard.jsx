import { memo } from 'react'
import { getRarity } from '../../theme/rarity'
import { albumClasses } from '../../theme/album'
import { RarityBadge } from '../ui/RarityBadge'
import { typeClasses } from '../../theme/typography'
import { prefersReducedMotion } from '../../utils/performance'
import { LockedFigurePlaceholder } from './LockedFigurePlaceholder'

function LockedFigureCardInner({
  figure,
  variant = 'featured',
  className = '',
}) {
  const rarity = getRarity(figure.rareza)
  const isFeatured = variant === 'featured'
  const reduced = prefersReducedMotion()
  const isBonus = Boolean(figure.is_bonus)

  return (
    <div
      className={`album-locked relative overflow-hidden ${isBonus ? 'album-locked-bonus' : ''} ${isFeatured ? 'aspect-[4/5]' : 'aspect-[3/4]'} ${className}`}
    >
      <LockedFigurePlaceholder className="absolute inset-0" />

      <div
        className={`absolute inset-0 ${isBonus ? 'opacity-35' : 'opacity-25'} ${rarity.tailwind.frame}`}
        aria-hidden
      />
      <div className={`absolute inset-x-0 top-0 h-1 ${rarity.tailwind.accent} opacity-50`} />

      {isFeatured && (
        <div
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#141416]/88 via-[#141416]/45 to-transparent px-4 pb-5 pt-16 text-center"
          aria-hidden
        >
          <p className={`${typeClasses.micro} ${isBonus ? 'text-amber-100/80' : 'text-white/65'}`}>
            {isBonus ? 'Bonus oculto' : 'Por descubrir'}
          </p>
          <p className={`${albumClasses.featuredDescription} mx-auto mt-2 max-w-[220px] text-white/55`}>
            {isBonus
              ? 'Una figurita especial puede aparecer cuando estés cerca.'
              : 'Desbloqueá más figuritas explorando San Fernando.'}
          </p>
        </div>
      )}

      <div className={`absolute ${isFeatured ? 'left-4 top-4' : 'left-2 top-2'} z-10 opacity-80`}>
        <RarityBadge rareza={figure.rareza} size={isFeatured ? 'md' : 'sm'} />
      </div>

      {!reduced && isBonus && (
        <div className="album-locked-shimmer pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      )}
    </div>
  )
}

export const LockedFigureCard = memo(LockedFigureCardInner)
