import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LazyMap } from '../components/performance/LazyMap'
import { ProgressBar } from '../components/ProgressBar'
import { useQaTestFigure } from '../hooks/useQaTestFigure'
import { useAppStore } from '../store/useAppStore'

export function MapScreen() {
  const navigate = useNavigate()
  const figures = useAppStore((state) => state.figures)
  const nearFigure = useAppStore((state) => state.nearFigure)
  const setNearFigure = useAppStore((state) => state.setNearFigure)
  const startCaptureSession = useAppStore((state) => state.startCaptureSession)
  const { mapFigures } = useQaTestFigure()

  const handleNearFigureChange = useCallback((figure) => {
    setNearFigure(figure)
  }, [setNearFigure])

  const handleOpenCamera = useCallback(
    ({ figure: sessionFigure, position, distanceToFigure } = {}) => {
      const target = sessionFigure ?? nearFigure
      if (!target) return
      const targetId = target.targetFigureId ?? target.id
      const stored = figures.find((f) => f.id === targetId)
      if (stored?.obtenida) return

      startCaptureSession({
        figure: target,
        position,
        distanceToFigure,
      })
      navigate('/capture')
    },
    [figures, nearFigure, navigate, startCaptureSession],
  )

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#141416]">
      <LazyMap
        figures={mapFigures}
        onNearFigureChange={handleNearFigureChange}
        onOpenCamera={handleOpenCamera}
      />

      <div className="safe-bottom pointer-events-none absolute inset-x-0 bottom-0 z-10 pb-2">
        <div className="pointer-events-auto mx-4 rounded-2xl border border-white/10 bg-charcoal/95 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <ProgressBar showSimulateLink={false} variant="dark" />
        </div>
      </div>
    </div>
  )
}
