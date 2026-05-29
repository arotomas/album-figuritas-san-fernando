/**
 * Modo rotación de producción (sale de la serie prog-*).
 * Prueba actual: bearing + counter-rotation en marcadores/punto azul,
 * sin aplicar rotate() al mapPane de Leaflet.
 */
export const MAP_ROTATION_MODE = {
  enabled: true,
  label: 'bearing-on-mappane-rotate-off',
  controller: {
    mountController: true,
    effectPositionOrBearing: true,
    applyMapPaneTransform: false,
    /** prog-03 saltó solo con rotate; origin en mapPane también desactivado aquí */
    applyTransformOrigin: false,
    usePivotFromGps: true,
    syncOriginMoveend: true,
    syncOriginZoomend: true,
  },
  app: {
    cinematicBearingHook: true,
    markerCounterBearing: true,
    userTrackHeading: true,
  },
}
