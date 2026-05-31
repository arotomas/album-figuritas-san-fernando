import { useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { usePushForegroundStore } from '../../store/pushForegroundStore'

export function PushForegroundToast() {
  const navigate = useNavigate()
  const current = usePushForegroundStore((state) => state.current)
  const dismiss = usePushForegroundStore((state) => state.dismiss)

  const handleOpen = useCallback(() => {
    if (!current) return
    const target = current.url || '/map'
    dismiss()
    navigate(target)
  }, [current, dismiss, navigate])

  if (!current) return null

  const toast = (
    <div className="safe-top pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[99998] flex justify-center px-4">
      <div
        className="pointer-events-auto w-full max-w-md rounded-2xl border border-white/15 bg-zinc-900/95 p-4 shadow-lg backdrop-blur-sm"
        role="alert"
        aria-live="assertive"
      >
        <p className="text-sm font-bold text-white">{current.title}</p>
        {current.body ? (
          <p className="mt-1 text-sm leading-relaxed text-white/90">{current.body}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleOpen}
            className="rounded-xl bg-progress px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink"
          >
            Ver
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold text-white/90"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(toast, document.body)
}
