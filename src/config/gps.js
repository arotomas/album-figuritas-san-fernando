/** Configuración GPS — optimizada para mobile urbano / caminando */

/** Diagnóstico GPS build-time — runtime: `isDebugGpsEnabled()` en `src/qa/qaCore.js` */
export const DEBUG_GPS =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEBUG_GPS === 'true'

/** Opciones únicas: alta precisión, sin caché del SO */
export const GPS_HIGH_ACCURACY_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15_000,
}

/** @deprecated usar GPS_HIGH_ACCURACY_OPTIONS */
export const GPS_REFINE_OPTIONS = GPS_HIGH_ACCURACY_OPTIONS

/** @deprecated ya no se usa fix rápido en arranque */
export const GPS_FAST_OPTIONS = GPS_HIGH_ACCURACY_OPTIONS

export const GPS_FAST_MAX_AGE_MS = 0

/** Throttle de updates después del primer fix confiable */
export const GPS_UPDATE_INTERVAL_MS = 1_000

/** Descartar fixes peores que esto (no mapa confiable ni gameplay) */
export const GPS_ACCEPT_MAX_ACCURACY_M = 80

/** Proximidad de figuritas — solo bajo este umbral */
export const GPS_PROXIMITY_MAX_ACCURACY_M = 50

/** Captura legacy / diagnóstico — ya no bloquea gameplay (foto obligatoria) */
export const GPS_CAPTURE_MAX_ACCURACY_M = 30

/** Por encima de este umbral se advierte que la ubicación es aproximada */
export const GPS_APPROXIMATE_CAPTURE_WARNING_M = GPS_ACCEPT_MAX_ACCURACY_M

/** @deprecated alias — usar GPS_ACCEPT_MAX_ACCURACY_M */
export const GPS_USABLE_ACCURACY_M = GPS_ACCEPT_MAX_ACCURACY_M

/** Reintentos de getCurrentPosition si watchPosition no entrega primer fix (Android) */
export const GPS_INITIAL_FIX_RETRY_MS = 5_000
export const GPS_INITIAL_FIX_MAX_ATTEMPTS = 3
export const GPS_NO_FIX_TIMEOUT_MS = 20_000

/** Sin updates GPS crudos durante este tiempo → GPS detenido o sin señal */
export const GPS_STALL_TIMEOUT_MS = 15_000

export const GPS_STALLED_LABEL = 'GPS detenido o sin señal'

export const GPS_ACQUISITION_LABEL = {
  initializing: 'Inicializando GPS…',
  waiting: 'Esperando señal GPS…',
  ready: 'GPS listo',
  no_response: 'GPS sin respuesta',
}

export const GPS_NO_FIX_MESSAGE =
  'Tu celular no está entregando ubicación GPS. Probá abrir Google Maps primero o activar Ubicación precisa.'

/** Tiempo antes de mostrar error si no hay ningún fix aceptable */
export const GPS_HARD_ERROR_MS = 12_000

/** Timeouts consecutivos sin fix antes de aviso fuerte */
export const GPS_MAX_TIMEOUTS_BEFORE_WARN = 4

/** Bounds aproximados San Fernando + margen — geometría del área principal. */
export const SF_BOUNDS = {
  minLat: -34.48,
  maxLat: -34.40,
  minLng: -58.58,
  maxLng: -58.52,
}

/** Geometría pura del área principal — usar geoPolicy para decisiones de aceptación. */
export function isWithinSanFernandoArea(lat, lng) {
  return (
    lat >= SF_BOUNDS.minLat &&
    lat <= SF_BOUNDS.maxLat &&
    lng >= SF_BOUNDS.minLng &&
    lng <= SF_BOUNDS.maxLng
  )
}

export function getAccuracyTier(accuracyMeters, { acceptMaxAccuracyM } = {}) {
  const acceptMax = acceptMaxAccuracyM ?? GPS_ACCEPT_MAX_ACCURACY_M
  if (accuracyMeters == null) return 'none'
  if (accuracyMeters <= GPS_CAPTURE_MAX_ACCURACY_M) return 'high'
  if (accuracyMeters <= GPS_PROXIMITY_MAX_ACCURACY_M) return 'medium'
  if (accuracyMeters <= acceptMax) return 'low'
  return 'poor'
}

/** Estado de calidad para UX y panel DEV */
export function getGpsQualityState(position, { acceptMaxAccuracyM } = {}) {
  if (!position) return 'searching'

  const { accuracy } = position
  const acceptMax = acceptMaxAccuracyM ?? GPS_ACCEPT_MAX_ACCURACY_M

  if (accuracy > acceptMax) return 'searching'
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

/** Posición usable para proximidad/captura flexible (cualquier fix con coords) */
export function canUseCaptureProximity(position) {
  return Boolean(
    position &&
      Number.isFinite(position.lat) &&
      Number.isFinite(position.lng),
  )
}

export function canUseCapture(position) {
  return Boolean(
    position &&
      position.accuracy <= GPS_CAPTURE_MAX_ACCURACY_M,
  )
}

export function getApproximateLocationMessage(accuracyMeters) {
  const meters = Math.round(accuracyMeters ?? 0)
  return `Tu celular está dando ubicación aproximada (±${meters}m). Activá Ubicación precisa para Chrome y tocá Reintentar.`
}

export const GPS_PRECISE_LOCATION_HELP =
  'En Android: mantené presionado Chrome > Información de la app > Permisos > Ubicación > activar Ubicación precisa.'
