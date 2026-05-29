/**
 * Reducción binaria de rotación (base estable: 496b6ae).
 * Una rama por prueba; flags acumulativos según orden de activación.
 */
export const MAP_ROTATION_BINARY = {
  mapRotationController: true,
  cinematicBearingHook: true,
  markerCounterBearing: false,
  userTrackHeading: false,
}

export const MAP_ROTATION_BINARY_LABEL = 'bin-02-cinematic-bearing'

export function isMapRotationInteractionActive() {
  return (
    MAP_ROTATION_BINARY.mapRotationController ||
    MAP_ROTATION_BINARY.cinematicBearingHook
  )
}
