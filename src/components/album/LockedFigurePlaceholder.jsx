import { memo } from 'react'
import { LOCKED_FIGURE_PLACEHOLDER_SRC } from '../../config/albumAssets'

function LockedFigurePlaceholderInner({ className = '' }) {
  return (
    <div className={`relative h-full w-full overflow-hidden bg-[#6a6a6a] ${className}`}>
      <img
        src={LOCKED_FIGURE_PLACEHOLDER_SRC}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center brightness-[0.86] saturate-[0.95]"
        draggable={false}
        aria-hidden
      />
      <div className="absolute inset-0 bg-[#1a1a1a]/22" aria-hidden />
    </div>
  )
}

export const LockedFigurePlaceholder = memo(LockedFigurePlaceholderInner)
