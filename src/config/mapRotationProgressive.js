/**
 * Reconstrucción lineal desde 496b6ae — UNA pieza nueva por deploy.
 *
 * 0 = baseline (496b6ae)
 * 1 = montar MapRotationController (sin efectos ni estilos)
 * 2 = + effectPositionOrBearing
 * 3 = + rotate en mapPane
 * 4 = + transformOrigin
 * 5 = + pivot GPS
 * 6 = + syncOrigin moveend
 * 7 = + syncOrigin zoomend
 */
export const MAP_ROTATION_PROGRESSIVE_STEP = 1

export const MAP_ROTATION_PROGRESSIVE_LABEL = 'prog-01-mount-only'

export function getMapRotationProgressiveFlags(step = MAP_ROTATION_PROGRESSIVE_STEP) {
  return {
    mountController: step >= 1,
    effectPositionOrBearing: step >= 2,
    applyMapPaneTransform: step >= 3,
    applyTransformOrigin: step >= 4,
    usePivotFromGps: step >= 5,
    syncOriginMoveend: step >= 6,
    syncOriginZoomend: step >= 7,
  }
}

export function isMapRotationControllerMounted(
  step = MAP_ROTATION_PROGRESSIVE_STEP,
) {
  return getMapRotationProgressiveFlags(step).mountController
}

export function isMapRotationInteractionActive(
  step = MAP_ROTATION_PROGRESSIVE_STEP,
) {
  const flags = getMapRotationProgressiveFlags(step)
  return (
    flags.syncOriginMoveend ||
    flags.syncOriginZoomend ||
    flags.applyMapPaneTransform
  )
}

export function canWriteMapPaneStyles(step = MAP_ROTATION_PROGRESSIVE_STEP) {
  const flags = getMapRotationProgressiveFlags(step)
  return flags.applyMapPaneTransform || flags.applyTransformOrigin
}
