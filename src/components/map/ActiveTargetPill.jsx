import { memo } from 'react'
import { FaXmark } from 'react-icons/fa6'

function ActiveTargetPillInner({ figureName, onCancel }) {
  if (!figureName) return null

  return (
    <div className="safe-top pointer-events-none absolute inset-x-4 top-3 z-[520] flex justify-center">
      <div className="pointer-events-auto flex max-w-[min(100%,22rem)] items-start gap-2 rounded-2xl border border-progress/35 bg-zinc-950/92 px-3 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-progress/85">
            Rumbo a
          </p>
          <p className="mt-1 line-clamp-2 font-display text-lg font-black uppercase leading-tight tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] sm:text-xl">
            {figureName}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 active:scale-95"
          aria-label="Cancelar seguimiento"
        >
          <FaXmark size={13} />
        </button>
      </div>
    </div>
  )
}

export const ActiveTargetPill = memo(ActiveTargetPillInner)
