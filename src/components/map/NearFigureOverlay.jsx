import { memo } from 'react'
import { m } from 'framer-motion'
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
          <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border-b border-amber-200/10 bg-gradient-to-r from-amber-300/10 via-white/5 to-violet-400/10 px-4 py-2 text-center"
          >
            <span className={`${typeClasses.micro} text-amber-100`}>
              ✦ Bonus {bonusKind} detectada ✦
            </span>
          </m.div>
        )}
        <div className="border-b border-white/8 px-4 py-3.5">
          <p className={`${typeClasses.label} text-center ${isBonus ? 'text-amber-100' : 'text-progress'}`}>
            {hint}
          </p>
          <p className="mt-1.5 text-center font-body text-xs text-white/50">
            {nearFigure.nombre}
          </p>
        </div>

        <div className="p-4">
          <PremiumButton variant="lime" size="md" onClick={onOpenCamera}>
            {isBonus ? 'Intentar agregarla' : 'Abrir cámara'}
          </PremiumButton>
        </div>
      </div>
    </GlowCard>
  )
}

export const NearFigureOverlay = memo(NearFigureOverlayInner)
