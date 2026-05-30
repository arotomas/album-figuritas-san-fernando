import { useExplorationStore } from '../store/explorationStore'

export function canExploreFigure(figure) {
  const lat = Number(figure?.lat)
  const lng = Number(figure?.lng)
  return Number.isFinite(lat) && Number.isFinite(lng)
}

/**
 * Activa modo exploración y navega al mapa. No toca captura ni activeTarget.
 */
export function resolveFigureCoordinates(figure, figures = []) {
  if (canExploreFigure(figure)) return figure
  if (!figure?.id || !Array.isArray(figures)) return figure

  return figures.find((entry) => String(entry.id) === String(figure.id)) ?? figure
}

export function startFigureExploration(
  figure,
  navigate,
  { withQa = (path) => path, figures = [] } = {},
) {
  const resolved = resolveFigureCoordinates(figure, figures)
  const started = useExplorationStore.getState().startExploration(resolved)
  console.info('[ROUTE_TARGET_SET]', {
    source: 'startFigureExploration',
    started,
    figureId: resolved?.id,
  })
  if (started) {
    console.info('[ROUTE_TARGET_COORDS]', {
      lat: Number(resolved?.lat),
      lng: Number(resolved?.lng),
    })
  }
  if (!started) return false

  navigate(withQa('/map'))
  return true
}
