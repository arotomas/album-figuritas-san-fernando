import { memo } from 'react'
import { LOCKED_FIGURE_PLACEHOLDER_SRC } from '../../config/albumAssets'

/** Silueta oficial de figurita (mismo asset que slots bloqueados del álbum). */
function FigureStickerIconInner({ className = 'h-4 w-4', alt = '' }) {
  return (
    <img
      src={LOCKED_FIGURE_PLACEHOLDER_SRC}
      alt={alt}
      className={`shrink-0 object-contain object-center ${className}`.trim()}
      width={16}
      height={16}
      decoding="async"
      draggable={false}
      aria-hidden={alt === ''}
    />
  )
}

export const FigureStickerIcon = memo(FigureStickerIconInner)
