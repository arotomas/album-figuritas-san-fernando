import { memo } from 'react'
import { albumClasses } from '../../theme/album'

function NewBadgeInner({ className = '' }) {
  return (
    <span
      className={`new-badge-pulse inline-flex items-center rounded-full bg-ink px-2 py-0.5 font-body text-[8px] font-bold uppercase tracking-[0.14em] text-warm-white shadow-sm ${className}`}
    >
      New
    </span>
  )
}

export const NewBadge = memo(NewBadgeInner)
