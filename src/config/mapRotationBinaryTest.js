import {
  MAP_ROTATION_PROGRESSIVE_LABEL,
  MAP_ROTATION_PROGRESSIVE_STEP,
  isMapRotationControllerMounted,
  isMapRotationInteractionActive,
} from './mapRotationProgressive'

/** Serie progresiva: sin hook cinemático ni counterBearing en marcadores. */
export const MAP_ROTATION_BINARY = {
  mapRotationController: isMapRotationControllerMounted(),
  cinematicBearingHook: false,
  markerCounterBearing: false,
  userTrackHeading: false,
}

export const MAP_ROTATION_BINARY_LABEL = MAP_ROTATION_PROGRESSIVE_LABEL

export { isMapRotationInteractionActive }
