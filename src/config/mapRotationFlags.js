import { MAP_ROTATION_MODE } from './mapRotationMode'
import {
  getMapRotationProgressiveFlags,
  isMapRotationControllerMounted as isProgressiveControllerMounted,
  isMapRotationInteractionActive as isProgressiveInteractionActive,
  MAP_ROTATION_PROGRESSIVE_STEP,
} from './mapRotationProgressive'

export function getMapRotationControllerFlags() {
  if (MAP_ROTATION_MODE.enabled) {
    return MAP_ROTATION_MODE.controller
  }
  return getMapRotationProgressiveFlags()
}

export function isMapRotationControllerMounted() {
  if (MAP_ROTATION_MODE.enabled) {
    return MAP_ROTATION_MODE.controller.mountController
  }
  return isProgressiveControllerMounted()
}

export function isMapRotationInteractionActive() {
  if (MAP_ROTATION_MODE.enabled) {
    const flags = MAP_ROTATION_MODE.controller
    return (
      flags.syncOriginMoveend ||
      flags.syncOriginZoomend ||
      flags.applyMapPaneTransform
    )
  }
  return isProgressiveInteractionActive()
}

export function canWriteMapPaneStyles() {
  const flags = getMapRotationControllerFlags()
  return flags.applyMapPaneTransform || flags.applyTransformOrigin
}

export function getMapRotationAppFlags() {
  if (MAP_ROTATION_MODE.enabled) {
    return MAP_ROTATION_MODE.app
  }
  return {
    cinematicBearingHook: false,
    markerCounterBearing: false,
    userTrackHeading: false,
  }
}

export function getMapRotationModeLabel() {
  if (MAP_ROTATION_MODE.enabled) {
    return MAP_ROTATION_MODE.label
  }
  return `prog-${String(MAP_ROTATION_PROGRESSIVE_STEP).padStart(2, '0')}`
}
