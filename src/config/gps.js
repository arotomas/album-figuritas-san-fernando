/** Configuración GPS — optimizada para mobile urbano / caminando */

/** Diagnóstico temporal en producción: badge en mapa + logs en consola */
export const DEBUG_GPS = true

/** Fase 1: vista rápida de zona (Wi‑Fi/red). Nunca proximidad ni captura. */
export const GPS_FAST_OPTIONS = {
  enableHighAccuracy: false,
  maximumAge: 5_000,
  timeout: 8_000,
}

export const GPS_FAST_MAX_AGE_MS = GPS_FAST_OPTIONS.maximumAge

/** Fase 2: refinamiento GPS real — sin caché vieja */
export const GPS_REFINE_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15_000,
}

/** Throttle de updates después del primer fix confiable */
export const GPS_UPDATE_INTERVAL_MS = 1_000

/** Descartar fixes peores que esto (no mapa confiable ni gameplay) */
export const GPS_ACCEPT_MAX_ACCURACY_M = 80

/** Proximidad de figuritas — solo bajo este umbral */
export const GPS_PROXIMITY_MAX_ACCURACY_M = 50

/** Captura — useGpsStability exige estabilidad bajo este umbral */
export const GPS_CAPTURE_MAX_ACCURACY_M = 30

/** @deprecated alias — usar GPS_ACCEPT_MAX_ACCURACY_M */
export const GPS_USABLE_ACCURACY_M = GPS_ACCEPT_MAX_ACCURACY_M

/** Tiempo antes de mostrar error si no hay ningún fix aceptable */
export const GPS_HARD_ERROR_MS = 12_000

/** Timeouts consecutivos sin fix antes de aviso fuerte */
export const GPS_MAX_TIMEOUTS_BEFORE_WARN = 4

/** Bounds aproximados San Fernando + margen (validar fix no absurdos) */
export const SF_BOUNDS = {
  minLat: -34.48,
  maxLat: -34.40,
  minLng: -58.58,
  maxLng: -58.52,
}

export function isWithinSanFernandoArea(lat, lng) {
  return (
    lat >= SF_BOUNDS.minLat &&
    lat <= SF_BOUNDS.maxLat &&
    lng >= SF_BOUNDS.minLng &&
    lng <= SF_BOUNDS.maxLng
  )
}

export function getAccuracyTier(accuracyMeters) {
  if (accuracyMeters == null) return 'none'
  if (accuracyMeters <= GPS_CAPTURE_MAX_ACCURACY_M) return 'high'
  if (accuracyMeters <= GPS_PROXIMITY_MAX_ACCURACY_M) return 'medium'
  if (accuracyMeters <= GPS_ACCEPT_MAX_ACCURACY_M) return 'low'
  return 'poor'
}

/** Estado de calidad para UX y panel DEV */
export function getGpsQualityState(position) {
  if (!position) return 'searching'

  const { accuracy } = position

  if (accuracy > GPS_ACCEPT_MAX_ACCURACY_M) return 'searching'
  if (accuracy > GPS_PROXIMITY_MAX_ACCURACY_M) return 'refining'
  if (accuracy > GPS_CAPTURE_MAX_ACCURACY_M) return 'proximity'
  return 'capture_ready'
}

export function getGpsPhase({ hasPosition, accuracyTier, qualityState }) {
  if (!hasPosition) return 'searching'
  if (qualityState === 'refining') return 'refining'
  if (qualityState === 'searching') return 'searching'
  if (accuracyTier === 'high' || accuracyTier === 'medium') return 'ready'
  return 'refining'
}

export function getGpsStatusLabel(phase, accuracyTier, qualityState) {
  if (qualityState === 'searching' || phase === 'searching') {
    return 'Buscando ubicación…'
  }

  if (qualityState === 'refining' || phase === 'refining') {
    return 'Mejorando precisión…'
  }

  if (qualityState === 'proximity') {
    return 'Ubicación lista — acercate al punto'
  }

  switch (phase) {
    case 'ready':
      if (accuracyTier === 'high') return 'GPS preciso'
      if (accuracyTier === 'medium') return 'Precisión buena'
      return 'GPS estabilizado'
    default:
      return 'Afinando señal…'
  }
}

export function canUseProximity(position) {
  return Boolean(
    position &&
      position.accuracy <= GPS_PROXIMITY_MAX_ACCURACY_M,
  )
}

export function canUseCapture(position) {
  return Boolean(
    position &&
      position.accuracy <= GPS_CAPTURE_MAX_ACCURACY_M,
  )
}
