import { isMapDebugLoggingEnabled } from '../config/mapDebug'
import { isQaShellActive } from '../qa/qaCore'
import { useMapCameraDebugStore } from '../store/mapCameraDebugStore'
import { recordMapDebugSession } from './mapDebugSession'

const STORAGE_CAMERA_LOG = 'album-map-debug-log'

function readUrlCameraLogFlag() {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return (
    params.get('map_debug_log') === '1' || params.get('mapDebugLog') === '1'
  )
}

function persistCameraLogFlagFromUrl() {
  if (typeof window === 'undefined') return
  if (!readUrlCameraLogFlag()) return
  try {
    sessionStorage.setItem(STORAGE_CAMERA_LOG, '1')
  } catch {
    // ignore
  }
}

function readPersistedCameraLogFlag() {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(STORAGE_CAMERA_LOG) === '1'
  } catch {
    return false
  }
}

function isOnMapRoute() {
  if (typeof window === 'undefined') return false
  return window.location.pathname === '/map'
}

/** Logging de cámara: URL, session, map_debug flags, o QA shell en /map. */
export function isCameraMoveLoggingEnabled() {
  if (typeof window === 'undefined') return false

  persistCameraLogFlagFromUrl()

  if (readUrlCameraLogFlag()) return true
  if (readPersistedCameraLogFlag()) return true
  if (isMapDebugLoggingEnabled()) return true
  if (isQaShellActive() && isOnMapRoute()) return true

  return false
}

export function getCameraMoveLoggingDiagnostics() {
  if (typeof window === 'undefined') {
    return {
      enabled: false,
      urlMapDebugLog: false,
      sessionMapDebugLog: false,
      mapDebugLogging: false,
      qaShellActive: false,
      onMapRoute: false,
    }
  }

  const params = new URLSearchParams(window.location.search)
  const urlMapDebugLog =
    params.get('map_debug_log') === '1' || params.get('mapDebugLog') === '1'

  return {
    enabled: isCameraMoveLoggingEnabled(),
    urlMapDebugLog,
    sessionMapDebugLog: readPersistedCameraLogFlag(),
    mapDebugLogging: isMapDebugLoggingEnabled(),
    qaShellActive: isQaShellActive(),
    onMapRoute: isOnMapRoute(),
  }
}

function formatLatLng(latlng) {
  if (!latlng) return null
  if (Array.isArray(latlng)) {
    return { lat: latlng[0], lng: latlng[1] }
  }
  return {
    lat: latlng.lat ?? latlng.latitude,
    lng: latlng.lng ?? latlng.longitude,
  }
}

function stackSnippet() {
  try {
    return new Error()
      .stack?.split('\n')
      .slice(2, 8)
      .map((line) => line.trim())
      .join(' | ')
  } catch {
    return 'stack-unavailable'
  }
}

/**
 * Log unificado de movimiento de cámara Leaflet.
 * Formato: [CAMERA_MOVE] origen | stack | latlng | timestamp
 */
export function logCameraMove(origen, detail = {}) {
  if (!isCameraMoveLoggingEnabled()) return

  const payload = {
    origen,
    stack: detail.stack ?? stackSnippet(),
    latlng: formatLatLng(detail.latlng ?? detail.center ?? detail.bounds),
    timestamp: Date.now(),
    method: detail.method ?? null,
    ...detail,
  }

  recordMapDebugSession(
    detail.method === 'invalidateSize' ? 'invalidateSize' : detail.method ?? 'flyTo',
    origen,
    payload,
  )

  useMapCameraDebugStore.getState().pushCameraMove(origen, payload)

  console.info('[CAMERA_MOVE]', payload)
}
