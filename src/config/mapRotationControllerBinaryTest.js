/**
 * Reducción binaria dentro de MapRotationController (base: 496b6ae + mount).
 * Una rama por flag; activar una sola pieza por prueba.
 */
export const MAP_RC_BINARY = {
  /** useEffect position/bearing → paintPane */
  effectPositionOrBearing: false,
  /** paintPane escribe mapPane.style.transformOrigin */
  applyTransformOrigin: false,
  /** paintPane escribe mapPane.style.transform (rotate) */
  applyMapPaneTransform: false,
  /** map.on('moveend') → syncOrigin */
  syncOriginMoveend: false,
  /** map.on('zoomend') → syncOrigin */
  syncOriginZoomend: false,
  /** latLngToContainerPoint(GPS); si false → centro del contenedor */
  usePivotFromGps: false,
}

export const MAP_RC_BINARY_LABEL = 'rc-00-mount-only'
