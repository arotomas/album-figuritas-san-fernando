import { useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { FaXmark } from 'react-icons/fa6'
import { useLaunchDiscoveryStore } from '../../store/launchDiscoveryStore'
import { useAppStore } from '../../store/useAppStore'

export function LaunchDiscoveryToast() {
  const navigate = useNavigate()
  const toastOpen = useLaunchDiscoveryStore((state) => state.toastOpen)
  const pendingFigure = useLaunchDiscoveryStore((state) => state.pendingFigure)
  const dismissToast = useLaunchDiscoveryStore((state) => state.dismissToast)
  const focusOnMap = useLaunchDiscoveryStore((state) => state.focusOnMap)
  const setNearFigure = useAppStore((state) => state.setNearFigure)

  const handleDismiss = useCallback(() => {
    dismissToast()
  }, [dismissToast])

  const handleView = useCallback(() => {
    if (!pendingFigure) return

    setNearFigure({
      ...pendingFigure,
      distanceMeters: pendingFigure.distanceMeters ?? null,
    })
    focusOnMap(pendingFigure.id)
    navigate('/map')
  }, [focusOnMap, navigate, pendingFigure, setNearFigure])

  if (!toastOpen) return null

  const toast = (
    <div className="safe-top pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[99997] flex justify-center px-4">
      <div
        className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/15 bg-zinc-900/95 px-4 py-3 shadow-lg backdrop-blur-sm"
        role="alert"
        aria-live="assertive"
      >
        <p className="min-w-0 flex-1 text-sm font-semibold text-white">
          👀 Hay una figurita cerca
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleView}
            className="rounded-xl bg-progress px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink"
          >
            Ver
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 text-white/90"
          >
            <FaXmark size={14} />
          </button>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(toast, document.body)
}
