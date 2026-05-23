import { memo, useCallback, useEffect, useRef } from 'react'
import { m } from 'framer-motion'
import { getRarity } from '../../theme/rarity'
import { motion as motionTokens } from '../../theme/motion'
import { RarityBadge } from '../ui/RarityBadge'
import { LockedFigureCard } from './LockedFigureCard'
import { NewBadge } from './NewBadge'

export const FigureCarousel = memo(function FigureCarousel({
  figures,
  activeId,
  lastObtenidaId,
  onSelect,
  compact = false,
}) {
  const scrollRef = useRef(null)
  const itemRefs = useRef(new Map())

  const scrollToActive = useCallback((figureId, behavior = 'smooth') => {
    const node = itemRefs.current.get(figureId)
    if (node && scrollRef.current) {
      node.scrollIntoView({
        behavior,
        inline: 'center',
        block: 'nearest',
      })
    }
  }, [])

  useEffect(() => {
    scrollToActive(activeId, 'smooth')
  }, [activeId, scrollToActive])

  return (
    <div
      ref={scrollRef}
      className={`flex shrink-0 gap-3 overflow-x-auto snap-x snap-mandatory ${
        compact ? 'mt-2 px-4 pb-2 scroll-pl-4' : 'mt-5 px-6 pb-6 scroll-pl-6'
      }`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {figures.map((figure) => {
        const isActive = figure.id === activeId
        const isNew = figure.obtenida && figure.id === lastObtenidaId
        const rarity = getRarity(figure.rareza)

        return (
          <m.button
            key={figure.id}
            ref={(node) => {
              if (node) itemRefs.current.set(figure.id, node)
              else itemRefs.current.delete(figure.id)
            }}
            type="button"
            layout={false}
            onClick={() => onSelect(figure.id)}
            whileTap={motionTokens.tap}
            animate={{
              scale: isActive ? 1.04 : 0.96,
              opacity: isActive ? 1 : 0.72,
              y: isActive ? -4 : 0,
            }}
            transition={motionTokens.spring.soft}
            className={`relative flex shrink-0 snap-center flex-col overflow-hidden rounded-2xl border-2 text-left transition-[filter,box-shadow] duration-300 ${
              compact ? 'w-[120px]' : 'w-[148px]'
            } ${
              isActive
                ? `${rarity.tailwind.frame} ${rarity.tailwind.glow}`
                : 'border-border/80 bg-surface/80'
            } ${!isActive && figure.obtenida ? 'album-carousel-dim' : ''}`}
            style={{
              filter: isActive ? 'none' : `blur(${figure.obtenida ? 0.4 : 0.8}px)`,
              boxShadow: isActive && figure.obtenida ? undefined : 'none',
            }}
          >
            {isNew && (
              <span className="absolute right-2 top-2 z-10">
                <NewBadge />
              </span>
            )}

            <div className={`h-1 w-full ${rarity.tailwind.accent} ${!figure.obtenida ? 'opacity-40' : ''}`} />

            {figure.obtenida ? (
              <>
                {figure.foto ? (
                  <img
                    src={figure.foto}
                    alt={figure.nombre}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[3/4] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center bg-charcoal/5 text-4xl">
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
              </>
            ) : (
              <>
                <LockedFigureCard figure={figure} variant="thumb" />
                <div className="p-2.5">
                  <p className="truncate font-display text-xs font-semibold text-muted">
                    ???
                  </p>
                  <div className="mt-1.5 opacity-60">
                    <RarityBadge rareza={figure.rareza} size="sm" />
                  </div>
                </div>
              </>
            )}
          </m.button>
        )
      })}
    </div>
  )
})
