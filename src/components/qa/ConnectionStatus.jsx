import { useEffect, useState } from 'react'
import { FaWifi, FaArrowsRotate } from 'react-icons/fa6'
import { useOfflineStatus } from '../../hooks/useOfflineStatus'

export function ConnectionStatus({ onUpdateAvailable }) {
  const { isOffline } = useOfflineStatus()
  const [wasOffline, setWasOffline] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)
  const [showUpdate, setShowUpdate] = useState(false)

  useEffect(() => {
    if (isOffline) {
      setWasOffline(true)
      setShowReconnected(false)
      return
    }

    if (wasOffline) {
      setShowReconnected(true)
      const timer = setTimeout(() => setShowReconnected(false), 3200)
      return () => clearTimeout(timer)
    }
  }, [isOffline, wasOffline])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const onControllerChange = () => {
      setShowUpdate(true)
      onUpdateAvailable?.()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [onUpdateAvailable])

  if (!isOffline && !showReconnected && !showUpdate) return null

  return (
    <div className="safe-top pointer-events-none fixed inset-x-0 top-0 z-[90] flex animate-slide-up justify-center px-4 pt-2">
      {isOffline && (
        <div
          className="flex max-w-sm items-center gap-2 rounded-full border border-amber-400/30 bg-zinc-900/95 px-4 py-2.5 shadow-md backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <FaWifi className="rotate-45 text-amber-400" size={14} aria-hidden />
          <span className="text-xs font-medium text-amber-200">
            Sin conexión — tu álbum sigue disponible
          </span>
        </div>
      )}

      {!isOffline && showReconnected && (
        <div
          className="flex items-center gap-2 rounded-full border border-progress/30 bg-zinc-900/95 px-4 py-2.5 shadow-md backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <FaWifi className="text-progress" size={14} aria-hidden />
          <span className="text-xs font-medium text-progress/80">Conexión restablecida</span>
        </div>
      )}

      {showUpdate && !isOffline && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-zinc-900/95 px-4 py-2.5 shadow-md backdrop-blur-sm"
        >
          <FaArrowsRotate className="text-white/80" size={13} aria-hidden />
          <span className="text-xs font-medium text-white/90">Nueva versión — tocá para actualizar</span>
        </button>
      )}
    </div>
  )
}
