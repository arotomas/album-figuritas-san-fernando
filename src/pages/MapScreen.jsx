import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { LazyMap } from '../components/performance/LazyMap'
import { ProgressBar } from '../components/ProgressBar'
import { useAppStore } from '../store/useAppStore'
import { isDevMode } from '../utils/devMode'

export function MapScreen() {
  const navigate = useNavigate()
  const figures = useAppStore((state) => state.figures)
  const devTestFigure = useAppStore((state) => state.devTestFigure)
  const nearFigure = useAppStore((state) => state.nearFigure)
  const setNearFigure = useAppStore((state) => state.setNearFigure)

  const mapFigures = useMemo(() => {
    if (!isDevMode() || !devTestFigure) return figures
    return [...figures, { ...devTestFigure, obtenida: false }]
  }, [figures, devTestFigure])

  const handleNearFigureChange = useCallback((figure) => {
    setNearFigure(figure)
  }, [setNearFigure])

  const handleOpenCamera = useCallback(() => {
    if (!nearFigure) return
    const targetId = nearFigure.targetFigureId ?? nearFigure.id
    const stored = figures.find((f) => f.id === targetId)
    if (stored?.obtenida) return
    navigate('/capture')
  }, [nearFigure, figures, navigate])

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
