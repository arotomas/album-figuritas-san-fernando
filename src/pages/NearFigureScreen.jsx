import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaLocationDot } from 'react-icons/fa6'
import { PremiumButton } from '../components/ui/PremiumButton'
import { ProgressBar } from '../components/ProgressBar'
import { useGeolocation } from '../hooks/useGeolocation'
import { useAppStore } from '../store/useAppStore'
import { getDistanceMeters } from '../utils/geo'
import { loadLastKnownPosition } from '../utils/lastKnownPosition'

export function NearFigureScreen() {
  const navigate = useNavigate()
  const nearFigure = useAppStore((state) => state.nearFigure)
  const setNearFigure = useAppStore((state) => state.setNearFigure)
  const startCaptureSession = useAppStore((state) => state.startCaptureSession)
  const { proximityPosition, mapPosition } = useGeolocation()

  const handleOpenCamera = () => {
    if (!nearFigure) return

    const position =
      proximityPosition ?? mapPosition ?? loadLastKnownPosition() ?? null
    const distanceToFigure = position
      ? getDistanceMeters(position.lat, position.lng, nearFigure.lat, nearFigure.lng)
      : nearFigure.isQaTest
        ? 0
        : null

    startCaptureSession({
      figure: nearFigure,
      position,
      distanceToFigure,
    })
    navigate('/capture')
  }

  if (!nearFigure) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="font-body text-sm text-muted">
          No estás cerca de ninguna figurita ahora.
        </p>
        <p className="mt-2 font-body text-xs text-muted/80">
          Volvé al mapa y acercate a un punto para desbloquearla.
        </p>
        <PremiumButton
          variant="outline"
          className="mt-6 w-full max-w-xs"
          onClick={() => navigate('/map')}
        >
          Ir al mapa
        </PremiumButton>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-between px-6 py-8">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="mb-6 text-red-500"
        >
          <FaLocationDot size={88} aria-hidden />
        </motion.div>

        <h1 className="mb-8 font-display text-2xl font-bold uppercase tracking-wide text-ink">
          ¡Estás cerca!
        </h1>

        <p className="mb-2 text-sm text-muted">{nearFigure.nombre}</p>

        <div className="w-full max-w-sm">
          <PremiumButton variant="lime" className="w-full" onClick={handleOpenCamera}>
            Abrí la cámara
          </PremiumButton>
        </div>

        <p className="mt-4 text-sm text-muted">
          Sacá una foto del lugar para desbloquear la figurita.
        </p>
      </div>

      <ProgressBar />
    </div>
  )
}
