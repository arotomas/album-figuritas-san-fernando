import { memo } from 'react'
import { getRarity } from '../../theme/rarity'
import { typeClasses } from '../../theme/typography'

function RarityBadgeInner({ rareza, size = 'md', className = '' }) {
  const rarity = getRarity(rareza)
  const sizes = {
    sm: 'px-1.5 py-px text-[8px]',
    md: 'px-2.5 py-1 text-[10px]',
    lg: 'px-3 py-1 text-xs',
  }

  return (
    <span
      className={`inline-flex items-center rounded-md font-bold uppercase tracking-widest text-white shadow-sm ${rarity.tailwind.badge} ${sizes[size]} ${className}`}
    >
      {rarity.label}
    </span>
  )
}

export const RarityBadge = memo(RarityBadgeInner)

export function RarityLabel({ rareza, className = '' }) {
  const rarity = getRarity(rareza)
  return (
    <span className={`${typeClasses.micro} ${rarity.tailwind.text} ${className}`}>
      {rarity.label}
    </span>
  )
}
