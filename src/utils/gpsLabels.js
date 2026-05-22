import { GPS_ACCEPT_MAX_ACCURACY_M } from '../config/gps'

export function getGpsDiscardLabel(reason, accuracy) {
  switch (reason) {
    case 'accuracy_too_poor':
      return accuracy != null
        ? `Precisión > ${GPS_ACCEPT_MAX_ACCURACY_M}m (±${Math.round(accuracy)}m)`
        : `Precisión > ${GPS_ACCEPT_MAX_ACCURACY_M}m`
    case 'outside_bounds':
      return 'Fuera de zona San Fernando'
    case 'absurd_jump':
      return 'Salto de ubicación inválido'
    case 'worse_or_redundant':
      return 'Lectura peor o redundante'
    case 'cached_coarse':
      return 'Fix en caché con baja precisión'
    case 'empty':
      return 'Lectura vacía'
    default:
      return reason ?? 'Descartada'
  }
}

export function getGpsErrorLabel(errorType) {
  switch (errorType) {
    case 'denied':
      return 'Permiso denegado'
    case 'timeout':
      return 'Timeout GPS'
    case 'unavailable':
      return 'Sin geolocation'
    case 'watch_error':
      return 'Error watchPosition'
    case 'approximate':
      return 'Ubicación aproximada (>80m)'
    default:
      return errorType ?? null
  }
}

export function formatGpsTimestamp(timestamp) {
  if (!timestamp) return '—'
  try {
    return new Date(timestamp).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return String(timestamp)
  }
}
