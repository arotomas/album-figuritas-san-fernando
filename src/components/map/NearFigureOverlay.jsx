import { memo } from 'react'
import { PremiumButton } from '../ui/PremiumButton'
import { GlowCard } from '../ui/GlowCard'
import { typeClasses } from '../../theme/typography'
import { getMapProximityHint } from '../../utils/proximityExperience'

function NearFigureOverlayInner({ nearFigure, onOpenCamera }) {
  if (!nearFigure) return null
  const isBonus = Boolean(nearFigure.is_bonus)
  const bonusKind =
    nearFigure.bonus_type === 'legendary' || nearFigure.rareza === 'legendaria'
      ? 'legendaria'
      : 'épica'
  const phase = nearFigure.proximity?.phase ?? 'medium'
  const hint = getMapProximityHint(phase, { isBonus })

  return (
    <GlowCard
      rareza={nearFigure.rareza ?? 'rara'}
      active
      className={`pointer-events-auto mx-4 mb-3 animate-slide-up ${isBonus ? 'bonus-near-alert' : ''}`}
    >
      <div className={`overflow-hidden rounded-2xl border bg-charcoal/95 ${
        isBonus ? 'border-amber-300/30 shadow-[0_0_36px_rgba(251,191,36,0.18)]' : 'border-white/10'
      }`}>
        {isBonus && (
          <div className="border-b border-amber-200/10 bg-gradient-to-r from-amber-300/10 via-white/5 to-violet-400/10 px-4 py-2 text-center">
            <span className={`${typeClasses.micro} text-amber-100`}>
              ✦ Bonus {bonusKind} detectada ✦
            </span>
          </div>
        )}
        <div className="border-b border-white/8 px-4 py-4">
          <p className={`${typeClasses.micro} text-center ${isBonus ? 'text-amber-100/90' : 'text-progress/90'}`}>
            {hint}
          </p>
          <h2 className="mt-2 line-clamp-2 text-center font-display text-xl font-black uppercase leading-tight tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)] sm:text-2xl">
            {nearFigure.nombre}
          </h2>
        </div>

        <div className="p-4">
          <PremiumButton variant="lime" size="md" onClick={onOpenCamera}>
            {isBonus ? 'Intentar agregarla' : 'Estoy acá'}
          </PremiumButton>
        </div>
      </div>
    </GlowCard>
  )
}

export const NearFigureOverlay = memo(NearFigureOverlayInner, (prev, next) => {
  const prevFigure = prev.nearFigure
  const nextFigure = next.nearFigure
  if (prevFigure?.id !== nextFigure?.id) return false
  if (prevFigure?.proximity?.phase !== nextFigure?.proximity?.phase) return false
  if (prevFigure?.nombre !== nextFigure?.nombre) return false
  return prev.onOpenCamera === next.onOpenCamera
})
