import { memo } from 'react'
import { getRarity } from '../../theme/rarity'
import { RarityBadge } from '../ui/RarityBadge'
import { prefersReducedMotion } from '../../utils/performance'

function FigureMarkerInner({
  figure,
  isNear,
  isPulsing,
  isActiveTarget = false,
  isDimmed = false,
  counterBearing = null,
}) {
  const isQaTest = Boolean(figure.isQaTest)
  const rarity = getRarity(figure.rareza)
  const obtained = figure.obtenida
  const reduced = prefersReducedMotion()
  const isLegendary = figure.rareza === 'legendaria' || figure.bonus_type === 'legendary'
  const isBonus = Boolean(figure.is_bonus)
  const floatClass =
    !reduced && !isActiveTarget ? `figure-float-r${rarity.tier}` : ''
  const pulseClass =
    isPulsing && !isActiveTarget && !reduced ? 'figure-pulse-premium' : ''
  const specialClass =
    !reduced && !isActiveTarget && (isLegendary || isBonus) ? 'figure-special-aura' : ''
  const activeClass = isActiveTarget && !obtained && !reduced ? 'figure-active-target' : ''
  const dimClass = isDimmed && !obtained ? 'figure-dimmed-marker' : ''

  const cardClass = isQaTest
    ? `relative w-[76px] overflow-hidden rounded-xl border-2 bg-gradient-to-b from-cyan-900 to-cyan-950 border-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.45)] ${
        obtained ? 'opacity-65 saturate-[0.45]' : ''
      } ${isNear && !obtained && !isActiveTarget ? 'ring-2 ring-cyan-300/80' : ''} ${
        isActiveTarget && !obtained ? 'ring-2 ring-progress/70' : ''
      }`
    : `relative w-[76px] overflow-hidden rounded-xl border-2 bg-gradient-to-b ${rarity.tailwind.gradient} ${rarity.tailwind.border} ${!obtained && !isActiveTarget ? rarity.tailwind.glow : ''} ${
        obtained ? 'opacity-65 saturate-[0.45]' : ''
      } ${isNear && !obtained && !isActiveTarget ? `ring-2 ${rarity.tailwind.ring}` : ''} ${
        isActiveTarget && !obtained ? 'ring-2 ring-progress/70' : ''
      }`

  const glowColor = isQaTest ? 'rgba(34,211,238,0.55)' : rarity.colors.glow
  const accentClass = isQaTest ? 'bg-cyan-400' : rarity.tailwind.accent
  const pointerColor = isQaTest ? '#22d3ee' : rarity.colors.secondary
  const markerVisualUrl = figure.marker_icon_url || figure.image_url || null

  const hasBearing =
    counterBearing != null && Number.isFinite(counterBearing)

  return (
    <div
      className={
        hasBearing
          ? 'transition-transform duration-[640ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
          : undefined
      }
      style={hasBearing ? { transform: `rotate(${counterBearing}deg)` } : undefined}
    >
      <div
        className={`relative flex flex-col items-center ${floatClass} ${pulseClass} ${specialClass} ${activeClass} ${dimClass}`}
      >
      {isActiveTarget && !obtained && !reduced && (
        <span
          className="figure-active-halo absolute top-1/2 h-[4.5rem] w-[4.5rem] -translate-y-1/2 rounded-full"
          style={{ background: glowColor }}
        />
      )}
      {isPulsing && !isActiveTarget && !reduced && (
        <span
          className="figure-pulse-ring absolute top-1/2 h-16 w-16 -translate-y-1/2 rounded-full"
          style={{ background: glowColor }}
        />
      )}
      {isLegendary && !obtained && !reduced && !isActiveTarget && (
        <span
          className="figure-legendary-spark absolute -top-2 left-1/2 h-20 w-20 -translate-x-1/2 rounded-full"
          aria-hidden
        />
      )}

      {!obtained && !isActiveTarget && (
        <div
          className="absolute -bottom-1 h-3 w-12 rounded-full blur-md"
          style={{ background: glowColor, opacity: 0.6 }}
          aria-hidden
        />
      )}

      <div className={cardClass}>
        <div className={`h-0.5 w-full ${accentClass}`} />

        <div
          className={
            markerVisualUrl
              ? 'h-[78px] w-full overflow-hidden'
              : 'flex items-center justify-center py-3 text-2xl'
          }
        >
          {obtained ? (
            '✓'
          ) : markerVisualUrl ? (
            <img
              src={markerVisualUrl}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          ) : (
            figure.emoji
          )}
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
            <span className="rounded-full bg-progress/90 px-1.5 py-0.5 text-[7px] font-bold uppercase text-ink">
              Obtenida
            </span>
          </div>
        )}
      </div>

      <div
        className="mt-0.5 h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent"
        style={{ borderTopColor: pointerColor }}
      />
      </div>
    </div>
  )
}

export const FigureMarker = memo(FigureMarkerInner)
