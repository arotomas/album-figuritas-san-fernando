import { isMapDebugLoggingEnabled } from '../config/mapDebug'
import { recordMapDebugSession } from './mapDebugSession'

export function isCameraMoveLoggingEnabled() {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return (
    params.get('map_debug_log') === '1' ||
    params.get('mapDebugLog') === '1' ||
    isMapDebugLoggingEnabled()
  )
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

  console.info('[CAMERA_MOVE]', payload)
}
