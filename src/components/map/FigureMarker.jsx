import { memo } from 'react'
import { getRarity } from '../../theme/rarity'
import { RarityBadge } from '../ui/RarityBadge'
import { prefersReducedMotion } from '../../utils/performance'

function FigureMarkerInner({ figure, isNear, isPulsing }) {
  const rarity = getRarity(figure.rareza)
  const obtained = figure.obtenida
  const reduced = prefersReducedMotion()
  const floatClass = !reduced ? `figure-float-r${rarity.tier}` : ''
  const pulseClass = isPulsing && !reduced ? 'figure-pulse-premium' : ''

  return (
    <div className={`relative flex flex-col items-center ${floatClass} ${pulseClass}`}>
      {isPulsing && !reduced && (
        <span
          className="figure-pulse-ring absolute top-1/2 h-16 w-16 -translate-y-1/2 rounded-full"
          style={{ background: rarity.colors.glow }}
        />
      )}

      {/* Soft glow under card */}
      {!obtained && (
        <div
          className="absolute -bottom-1 h-3 w-12 rounded-full blur-md"
          style={{ background: rarity.colors.glow, opacity: 0.6 }}
          aria-hidden
        />
      )}

      <div
        className={`relative w-[76px] overflow-hidden rounded-xl border-2 bg-gradient-to-b ${rarity.tailwind.gradient} ${rarity.tailwind.border} ${!obtained ? rarity.tailwind.glow : ''} ${
          obtained ? 'opacity-65 saturate-[0.45]' : ''
        } ${isNear && !obtained ? `ring-2 ${rarity.tailwind.ring}` : ''}`}
      >
        <div className={`h-0.5 w-full ${rarity.tailwind.accent}`} />

        <div className="flex items-center justify-center py-3 text-2xl">
          {obtained ? '✓' : figure.emoji}
        </div>

        <div className="px-1.5 pb-2">
          <p className="truncate text-[8px] font-bold uppercase leading-tight tracking-wide text-white/90">
            {figure.nombre.split(' ').slice(-2).join(' ')}
          </p>
          <div className="mt-1 scale-[0.85] origin-left">
            <RarityBadge rareza={figure.rareza} size="sm" />
          </div>
        </div>

        {obtained && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
            <span className="rounded-full bg-lime-400/90 px-1.5 py-0.5 text-[7px] font-bold uppercase text-ink">
              Obtenida
            </span>
          </div>
        )}
      </div>

      <div
        className="mt-0.5 h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent"
        style={{ borderTopColor: rarity.colors.secondary }}
      />
    </div>
  )
}

export const FigureMarker = memo(FigureMarkerInner)
