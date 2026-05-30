import { memo } from 'react'
import { FaXmark } from 'react-icons/fa6'

function ActiveTargetPillInner({ figureName, onCancel }) {
  if (!figureName) return null

  return (
    <div className="safe-top pointer-events-none absolute inset-x-4 top-4 z-[520] flex justify-center">
      <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-progress/35 bg-zinc-950/95 px-3 py-2 shadow-[0_8px_28px_rgba(0,0,0,0.45)]">
        <span className="truncate text-xs font-semibold text-white/90">
          Rumbo a: <span className="text-progress">{figureName}</span>
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 active:scale-95"
          aria-label="Cancelar seguimiento"
        >
          <FaXmark size={12} />
        </button>
      </div>
    </div>
  )
}

export const ActiveTargetPill = memo(ActiveTargetPillInner)
