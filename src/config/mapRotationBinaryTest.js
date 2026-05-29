/**
 * Reducción binaria rotación app (base estable: 496b6ae).
 * Series RC: solo mapRotationController; piezas en mapRotationControllerBinaryTest.js
 */
export const MAP_ROTATION_BINARY = {
  mapRotationController: true,
  cinematicBearingHook: false,
  markerCounterBearing: false,
  userTrackHeading: false,
}

export const MAP_ROTATION_BINARY_LABEL = 'rc-00-mount-only'

export function isMapRotationInteractionActive() {
  return MAP_ROTATION_BINARY.mapRotationController
}
