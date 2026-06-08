/** Figuritas ya alertadas en esta sesión de la PWA (sin cooldown temporal). */
const alertedFigureIds = new Set()

export function hasLaunchDiscoveryAlerted(figureId) {
  if (figureId == null) return false
  return alertedFigureIds.has(String(figureId))
}

export function markLaunchDiscoveryAlerted(figureId) {
  if (figureId == null) return
  alertedFigureIds.add(String(figureId))
}

export function resetLaunchDiscoverySession() {
  alertedFigureIds.clear()
}
