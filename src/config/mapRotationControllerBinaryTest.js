/**
 * Sub-reducción rc-01: aislar effect / origin / rotate / pivot.
 */
export const MAP_RC_BINARY = {
  effectPositionOrBearing: true,
  applyTransformOrigin: true,
  applyMapPaneTransform: false,
  syncOriginMoveend: false,
  syncOriginZoomend: false,
  usePivotFromGps: true,
}

export const MAP_RC_BINARY_LABEL = 'rc01-b-origin-no-rotate'
