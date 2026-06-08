import {
  getHiddenBonusDetectionFigures,
  getPlayerMapFigures,
} from './figureGameRules'

function isCapturableCoordinate(figure) {
  const lat = Number(figure?.lat)
  const lng = Number(figure?.lng)
  return Number.isFinite(lat) && Number.isFinite(lng)
}

/** Figuritas elegibles para descubrimiento pasivo (universo visible + bonus ocultos, sin obtenidas). */
export function getLaunchDiscoveryFigures(figures, discoveredBonusIds = new Set()) {
  if (!figures?.length) return []

  const visible = getPlayerMapFigures(figures, discoveredBonusIds)
  const hiddenBonus = getHiddenBonusDetectionFigures(figures)
  const byId = new Map()

  for (const figure of [...visible, ...hiddenBonus]) {
    if (!figure || figure.obtenida) continue
    if (!isCapturableCoordinate(figure)) continue
    byId.set(String(figure.id), figure)
  }

  return [...byId.values()]
}
