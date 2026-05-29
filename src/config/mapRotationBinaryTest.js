import {
  getMapRotationAppFlags,
  getMapRotationModeLabel,
  isMapRotationControllerMounted,
  isMapRotationInteractionActive,
} from './mapRotationFlags'

const appFlags = getMapRotationAppFlags()

export const MAP_ROTATION_BINARY = {
  mapRotationController: isMapRotationControllerMounted(),
  cinematicBearingHook: appFlags.cinematicBearingHook,
  markerCounterBearing: appFlags.markerCounterBearing,
  userTrackHeading: appFlags.userTrackHeading,
}

export const MAP_ROTATION_BINARY_LABEL = getMapRotationModeLabel()

export { isMapRotationInteractionActive }
