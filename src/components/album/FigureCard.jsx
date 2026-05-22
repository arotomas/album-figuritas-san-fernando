import { memo } from 'react'
import { m } from 'framer-motion'
import { getRarity } from '../../theme/rarity'
import { RarityBadge } from '../ui/RarityBadge'
import { motion as motionTokens } from '../../theme/motion'
import { GlowCard } from '../ui/GlowCard'

export const FigureCard = memo(function FigureCard({
  figure,
  isActive,
  isLastViewed,
  onSelect,
}) {
  const rarity = getRarity(figure.rareza)

  const card = (
    <m.button
      type="button"
      layout
      onClick={() => onSelect(figure.id)}
      whileTap={motionTokens.tap}
      animate={{ scale: isActive ? 1.03 : 1 }}
      transition={motionTokens.spring.soft}
      className={`relative flex w-[148px] shrink-0 snap-center flex-col overflow-hidden rounded-2xl border-2 text-left ${
        isActive
          ? `${rarity.tailwind.frame} ${rarity.tailwind.glow}`
          : 'border-border bg-surface'
      } ${!figure.obtenida ? 'opacity-50 grayscale' : ''}`}
    >
      {isLastViewed && figure.obtenida && (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-ink px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-warm-white">
          Última
        </span>
      )}

      <div className={`h-1 w-full ${rarity.tailwind.accent}`} />

      {figure.foto ? (
        <img
          src={figure.foto}
          alt={figure.nombre}
          loading="lazy"
          decoding="async"
          className="aspect-[3/4] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[3/4] items-center justify-center bg-warm-white text-4xl">
          {figure.emoji}
        </div>
      )}

      <div className="p-2.5">
        <p className="truncate font-display text-xs font-semibold text-ink">
          {figure.nombre}
        </p>
        <div className="mt-1.5">
          <RarityBadge rareza={figure.rareza} size="sm" />
        </div>
      </div>
    </m.button>
  )

  if (isActive) {
    return (
      <GlowCard rareza={figure.rareza} active as="div">
        {card}
      </GlowCard>
    )
  }

  return card
})
