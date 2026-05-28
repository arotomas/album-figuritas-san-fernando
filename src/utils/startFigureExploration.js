import { useExplorationStore } from '../store/explorationStore'

export function canExploreFigure(figure) {
  const lat = Number(figure?.lat)
  const lng = Number(figure?.lng)
  return Number.isFinite(lat) && Number.isFinite(lng)
}

/**
 * Activa modo exploración y navega al mapa. No toca captura ni activeTarget.
 */
export function startFigureExploration(figure, navigate, { withQa = (path) => path } = {}) {
  const started = useExplorationStore.getState().startExploration(figure)
  if (!started) return false

  navigate(withQa('/map'))
  return true
}
