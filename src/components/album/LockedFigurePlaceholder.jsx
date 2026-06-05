import { memo } from 'react'
import { LOCKED_FIGURE_PLACEHOLDER_SRC } from '../../config/albumAssets'

function LockedFigurePlaceholderInner({ className = '' }) {
  return (
    <div className={`relative h-full w-full overflow-hidden bg-[#ECEEF2] ${className}`}>
      <img
        src={LOCKED_FIGURE_PLACEHOLDER_SRC}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center opacity-55 saturate-[0.35]"
        draggable={false}
        aria-hidden
      />
      <div className="absolute inset-0 bg-[#F3F4F6]/72" aria-hidden />
    </div>
  )
}

export const LockedFigurePlaceholder = memo(LockedFigurePlaceholderInner)
