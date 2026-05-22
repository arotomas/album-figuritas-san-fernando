import { memo } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { getRarity } from '../../theme/rarity'
import { album, albumClasses } from '../../theme/album'
import { typeClasses } from '../../theme/typography'
import { motion as motionTokens } from '../../theme/motion'
import { useFeaturedCardEffects } from '../../hooks/useFeaturedCardEffects'
import { ShineEffect } from '../ui/ShineEffect'
import { RarityBadge } from '../ui/RarityBadge'
import { LockedFigureCard } from './LockedFigureCard'
import { NewBadge } from './NewBadge'
import { prefersReducedMotion } from '../../utils/performance'

function FeaturedFigureCardInner({ figure, isNew = false, dragX = 0 }) {
  const rarity = getRarity(figure.rareza)
  const reduced = prefersReducedMotion()
  const { cardRef, cardMotionStyle, glareStyle, onPointerMove, onPointerLeave } =
    useFeaturedCardEffects({ enabled: !reduced && figure.obtenida })

  if (!figure.obtenida) {
    return (
      <div
        className={`card-texture relative overflow-hidden rounded-[1.35rem] border-2 shadow-2xl ${rarity.tailwind.border} ${rarity.tailwind.glow}`}
      >
        <LockedFigureCard figure={figure} variant="featured" />
        <div className={`h-1 w-full ${rarity.tailwind.accent} opacity-50`} />
      </div>
    )
  }

  return (
    <m.div
      ref={cardRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{
        perspective: album.featured.perspective,
        rotateY: reduced ? 0 : cardMotionStyle.rotateY + dragX / 55,
        rotateX: reduced ? 0 : cardMotionStyle.rotateX,
      }}
      className="relative w-full"
    >
      {/* Outer halo */}
      <div
        className="absolute -inset-3 rounded-[1.6rem] opacity-70 transition-opacity duration-500"
        style={{
          background: `radial-gradient(ellipse at 50% 20%, ${rarity.colors.glow}, transparent 68%)`,
        }}
        aria-hidden
      />

      <div
        className={`card-texture relative overflow-hidden rounded-[1.35rem] border-2 bg-gradient-to-b shadow-2xl ${rarity.tailwind.gradient} ${rarity.tailwind.border} ${rarity.tailwind.glow}`}
      >
        <ShineEffect active rarityShine={rarity.tailwind.shine} />

        {/* Dynamic glare */}
        {!reduced && (
          <div
            className="pointer-events-none absolute inset-0 z-10 mix-blend-overlay"
            style={glareStyle}
            aria-hidden
          />
        )}

        {/* Glass reflection top edge */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-white/10 to-transparent"
          aria-hidden
        />

        {/* Corner accents */}
        <div className={`absolute left-3 top-3 z-10 h-6 w-6 border-l-2 border-t-2 ${rarity.tailwind.border}`} />
        <div className={`absolute right-3 top-3 z-10 h-6 w-6 border-r-2 border-t-2 ${rarity.tailwind.border}`} />
        <div className={`absolute bottom-3 left-3 z-10 h-6 w-6 border-b-2 border-l-2 ${rarity.tailwind.border}`} />
        <div className={`absolute bottom-3 right-3 z-10 h-6 w-6 border-b-2 border-r-2 ${rarity.tailwind.border}`} />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-5">
          <RarityBadge rareza={figure.rareza} size="md" />
          <div className="flex items-center gap-2">
            {isNew && <NewBadge />}
            <span className="text-2xl drop-shadow-md">{figure.emoji}</span>
          </div>
        </div>

        {/* Photo */}
        <div className="relative z-10 mx-5 mt-3">
          <div className={`overflow-hidden rounded-xl border-2 ${rarity.tailwind.border} bg-black/30 p-1`}>
            {figure.foto ? (
              <img
                src={figure.foto}
                alt={figure.nombre}
                loading="lazy"
                decoding="async"
                className="aspect-[4/5] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center bg-charcoal/80 text-6xl">
                {figure.emoji}
              </div>
            )}
          </div>
          <div className="pointer-events-none absolute inset-x-4 top-2 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
        </div>

        {/* Info */}
        <AnimatePresence mode="wait">
          <m.div
            key={figure.id}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={album.transition.description}
            className="relative z-10 px-5 py-5"
          >
            <p className={`${typeClasses.micro} mb-1.5 text-white/45`}>San Fernando</p>
            <h2 className={`${typeClasses.display} ${albumClasses.featuredTitle} text-warm-white`}>
              {figure.nombre}
            </h2>
            <p className={`${albumClasses.featuredDescription} mt-2 text-white/55`}>
              {figure.description}
            </p>
            <p className={`${albumClasses.headerEyebrow} mt-3 text-white/35`}>
              Obtenida · Tu colección
            </p>
          </m.div>
        </AnimatePresence>

        <div className={`relative z-10 h-1 w-full ${rarity.tailwind.accent}`} />
      </div>
    </m.div>
  )
}

export const FeaturedFigureCard = memo(FeaturedFigureCardInner)
