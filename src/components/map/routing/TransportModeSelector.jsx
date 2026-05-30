import { memo } from 'react'
import { TRANSPORT_MODES } from '../../../config/navigationUx'

function TransportModeSelectorInner({ value, onChange }) {
  return (
    <div
      className="pointer-events-auto mb-2 flex items-center gap-1 rounded-full border border-white/10 bg-zinc-950/82 p-0.5 shadow-md backdrop-blur-sm"
      role="group"
      aria-label="Modo de transporte"
    >
      {TRANSPORT_MODES.map(({ id, emoji, label }) => {
        const active = value === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`flex min-h-[32px] items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
              active
                ? 'bg-progress/20 text-progress'
                : 'text-white/55 hover:text-white/80'
            }`}
            aria-pressed={active}
            aria-label={label}
          >
            <span aria-hidden>{emoji}</span>
            <span className="hidden min-[360px]:inline">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

export const TransportModeSelector = memo(TransportModeSelectorInner)
