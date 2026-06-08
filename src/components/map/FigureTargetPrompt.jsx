import { memo } from 'react'
import { PremiumButton } from '../ui/PremiumButton'

function FigureTargetPromptInner({ figure, onConfirm, onDismiss }) {
  if (!figure) return null

  return (
    <div className="pointer-events-auto absolute inset-x-4 bottom-28 z-[520] animate-slide-up">
      <div className="overflow-hidden rounded-2xl border border-white/12 bg-charcoal/95 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="border-b border-white/8 px-4 py-4">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.16em] text-progress/90">
            ¿Ir a este punto?
          </p>
          <p className="mt-2 line-clamp-2 text-center font-display text-xl font-black uppercase leading-tight tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)] sm:text-2xl">
            {figure.nombre}
          </p>
        </div>
        <div className="flex gap-2 p-4">
          <PremiumButton
            variant="ghost"
            size="md"
            className="flex-1 border border-white/25 bg-white/10 text-white hover:bg-white/20"
            uiSound={false}
            onClick={onDismiss}
          >
            Cancelar
          </PremiumButton>
          <PremiumButton variant="lime" size="md" className="flex-1" uiSound={false} onClick={onConfirm}>
            Ir a este punto
          </PremiumButton>
        </div>
      </div>
    </div>
  )
}

export const FigureTargetPrompt = memo(FigureTargetPromptInner)
