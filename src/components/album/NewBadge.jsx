import { memo } from 'react'
import { albumClasses } from '../../theme/album'

function NewBadgeInner({ className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-md bg-ink/85 px-1.5 py-px font-body text-[7px] font-bold uppercase tracking-[0.1em] text-white shadow-sm ${className}`}
    >
      Nuevo
    </span>
  )
}

export const NewBadge = memo(NewBadgeInner)
