import { memo } from 'react'
import { formatDistance } from '../../utils/geo'
import { PremiumButton } from '../ui/PremiumButton'
import { GlowCard } from '../ui/GlowCard'
import { typeClasses } from '../../theme/typography'

function NearFigureOverlayInner({ nearFigure, onOpenCamera }) {
  if (!nearFigure) return null
  const isBonus = Boolean(nearFigure.is_bonus)
  const bonusKind =
    nearFigure.bonus_type === 'legendary' || nearFigure.rareza === 'legendaria'
      ? 'legendaria'
      : 'épica'

  return (
    <GlowCard
      rareza={nearFigure.rareza ?? 'rara'}
      active
      className="pointer-events-auto mx-4 mb-3 animate-slide-up"
    >
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-charcoal/95">
        <div className="border-b border-white/8 px-4 py-3.5">
          <p className={`${typeClasses.label} text-center text-progress`}>
            {isBonus
              ? `Estás a ${formatDistance(nearFigure.distanceMeters)} de una figurita ${bonusKind}. ¿Querés intentar agregarla?`
              : 'Estás cerca. Sacá una foto del lugar para desbloquear la figurita.'}
          </p>
          <p className="mt-1.5 text-center font-body text-xs text-white/50">
            {nearFigure.nombre} · a {formatDistance(nearFigure.distanceMeters)}
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
