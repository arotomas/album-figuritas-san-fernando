import { useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useQaMode } from '../utils/qaMode'

/** Figuritas del mapa incluyendo la temporal QA (solo con ?qa=1 o dev). */
export function useQaTestFigure(baseFigures = null) {
  const storeFigures = useAppStore((state) => state.figures)
  const qaTestFigure = useAppStore((state) => state.qaTestFigure)
  const { canUseTestFigure } = useQaMode()
  const figures = baseFigures ?? storeFigures

  const mapFigures = useMemo(() => {
    if (!canUseTestFigure || !qaTestFigure) return figures
    return [...figures, { ...qaTestFigure, obtenida: false }]
  }, [canUseTestFigure, figures, qaTestFigure])

  return { mapFigures, qaTestFigure, canUseTestFigure }
}
