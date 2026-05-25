/** @deprecated — usar `import from '../geo'` */
export {
  allowsPreviewOutsidePrimaryArea,
  evaluateGeoFix,
  getGeoPolicyMode,
  getGeoPolicySnapshot,
  getPrimaryAreaStatus,
  isPositionInPlayableArea,
  isWithinPrimaryArea,
  shouldRejectFixForGeoPolicy,
  shouldShowOutsidePrimaryWarning,
  GEO_OUTSIDE_PRIMARY_LABEL,
  GEO_POLICY_MODE,
} from '../geo/geoPolicy'

/** @deprecated — usar `import from '../qa'` */
export {
  QA_ACCEPT_MAX_ACCURACY_M,
  QA_TELEPORT_PRESETS,
  buildQaAvailabilitySummary,
  clearQaMockPosition,
  getEffectiveAcceptMaxAccuracyM,
  getQaSanFernandoStatus,
  isAcceptedGpsPosition,
  isPositionAccuracyAccepted,
  isPositionInPlayableArea,
  isQaLocationBypassActive,
  setQaMockPosition,
  teleportQaNearFigure,
  teleportQaToPreset,
} from '../qa/qaLocation'
