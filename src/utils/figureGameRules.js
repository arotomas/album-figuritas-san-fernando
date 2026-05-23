export const INITIAL_REVEALED_NORMAL_SLOTS = 5
export const MAIN_ALBUM_NORMAL_TOTAL = 10
export const DEFAULT_CAPTURE_RADIUS = 250
export const DEFAULT_REVEAL_RADIUS = 200
export const DEFAULT_MARKER_ICON_SIZE = 48

export function isBonusFigure(figure) {
  return Boolean(figure?.is_bonus)
}

export function getNormalFigures(figures) {
  return (Array.isArray(figures) ? figures : [])
    .filter((figure) => figure && !isBonusFigure(figure))
    .sort((a, b) => {
      const orderA = Number(a.unlock_order) || Number.MAX_SAFE_INTEGER
      const orderB = Number(b.unlock_order) || Number.MAX_SAFE_INTEGER
      if (orderA !== orderB) return orderA - orderB
      return String(a.id).localeCompare(String(b.id))
    })
    .slice(0, MAIN_ALBUM_NORMAL_TOTAL)
}

export function getBonusFigures(figures) {
  return (Array.isArray(figures) ? figures : []).filter(isBonusFigure)
}

export function getObtainedNormalCount(figures) {
  return getNormalFigures(figures).filter((figure) => figure.obtenida).length
}

export function getMainProgressState(figures) {
  const normalFigures = getNormalFigures(figures)
  const obtained = normalFigures.filter((figure) => figure.obtenida).length
  const total = normalFigures.length
  const visibleTotal = Math.min(
    total,
    Math.max(INITIAL_REVEALED_NORMAL_SLOTS, obtained + INITIAL_REVEALED_NORMAL_SLOTS),
  )

  return {
    normalFigures,
    obtained,
    total,
    visibleTotal,
    completed: total > 0 && obtained >= total,
  }
}

export function isNormalFigureRevealed(figure, obtainedNormalCount, visibleNormalTotal) {
  if (!figure || isBonusFigure(figure)) return false
  if (figure.obtenida) return true

  const revealAfter = Number(figure.reveal_after_count)
  if (Number.isFinite(revealAfter) && obtainedNormalCount >= revealAfter) return true

  const order = Number(figure.unlock_order)
  if (Number.isFinite(order) && order > 0) return order <= visibleNormalTotal

  return true
}

export function getRevealedNormalFigures(figures) {
  const progress = getMainProgressState(figures)
  return progress.normalFigures.filter((figure) =>
    isNormalFigureRevealed(figure, progress.obtained, progress.visibleTotal),
  )
}

export function getPlayerMapFigures(figures, discoveredBonusIds = new Set()) {
  const progress = getMainProgressState(figures)
  const revealedNormal = progress.normalFigures.filter((figure) =>
    isNormalFigureRevealed(figure, progress.obtained, progress.visibleTotal),
  )
  const bonus = getBonusFigures(figures).filter(
    (figure) =>
      progress.completed ||
      discoveredBonusIds.has(String(figure.id)),
  )

  return [...revealedNormal, ...bonus]
}

export function getHiddenBonusDetectionFigures(figures) {
  const progress = getMainProgressState(figures)
  if (progress.completed) return []
  return getBonusFigures(figures).filter((figure) => !figure.obtenida)
}
