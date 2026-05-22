import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LazyMap } from '../components/performance/LazyMap'
import { ProgressBar } from '../components/ProgressBar'
import { useAppStore } from '../store/useAppStore'

export function MapScreen() {
  const navigate = useNavigate()
  const figures = useAppStore((state) => state.figures)
  const nearFigure = useAppStore((state) => state.nearFigure)
  const setNearFigure = useAppStore((state) => state.setNearFigure)

  const handleNearFigureChange = useCallback((figure) => {
    setNearFigure(figure)
  }, [setNearFigure])

  const handleOpenCamera = useCallback(() => {
    if (nearFigure) {
      navigate('/capture')
    }
  }, [nearFigure, navigate])

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <LazyMap
        figures={figures}
        className="absolute inset-0 min-h-[50dvh]"
        onNearFigureChange={handleNearFigureChange}
        onOpenCamera={handleOpenCamera}
      />

      <div className="pointer-events-none relative z-10 mt-auto">
        <div className="pointer-events-auto mx-4 mb-4 rounded-2xl border border-white/10 bg-charcoal/95 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <ProgressBar showSimulateLink={false} variant="dark" />
        </div>
      </div>
    </div>
  )
}
