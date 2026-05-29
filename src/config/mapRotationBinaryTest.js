/**
 * Reducción binaria de rotación (base estable: 496b6ae).
 * Una rama por prueba; flags acumulativos según orden de activación.
 *
 * Prueba 1: mapRotationController
 * Prueba 2: + cinematicBearingHook
 * Prueba 3: + markerCounterBearing
 * Prueba 4: + userTrackHeading
 */
export const MAP_ROTATION_BINARY = {
  mapRotationController: true,
  cinematicBearingHook: false,
  markerCounterBearing: false,
  userTrackHeading: false,
}

export const MAP_ROTATION_BINARY_LABEL = 'bin-01-map-controller'

export function isMapRotationInteractionActive() {
  return (
    MAP_ROTATION_BINARY.mapRotationController ||
    MAP_ROTATION_BINARY.cinematicBearingHook
  )
}
