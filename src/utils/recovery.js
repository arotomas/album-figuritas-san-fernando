import { logDiagnostic } from './diagnostics'

export function isDocumentVisible() {
  return typeof document === 'undefined' || document.visibilityState === 'visible'
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Reintenta una acción async con backoff corto (permisos, cámara, GPS).
 */
export async function retryWithBackoff(fn, { attempts = 3, baseDelayMs = 400 } = {}) {
  let lastError

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      logDiagnostic('retry', { attempt: attempt + 1, error: error?.message })
      if (attempt < attempts - 1) {
        await delay(baseDelayMs * (attempt + 1))
      }
    }
  }

  throw lastError
}

export function classifyGeoError(code) {
  switch (code) {
    case 1:
      return { type: 'denied', message: 'Necesitamos permiso de ubicación para mostrarte en el mapa.' }
    case 2:
      return { type: 'unavailable', message: 'No pudimos obtener tu ubicación. Intentá de nuevo.' }
    case 3:
      return { type: 'timeout', message: 'La ubicación tardó demasiado. Verificá tu señal GPS.' }
    default:
      return { type: 'unknown', message: 'Error de ubicación.' }
  }
}

export function classifyCameraError(error) {
  if (error === 'PERMISSION_DENIED' || error?.message === 'PERMISSION_DENIED') {
    return { type: 'denied', message: 'Necesitamos acceso a la cámara para capturar tu figurita.' }
  }
  if (error === 'CAMERA_UNSUPPORTED' || error?.message === 'CAMERA_UNSUPPORTED') {
    return { type: 'unsupported', message: 'Tu dispositivo no soporta cámara web.' }
  }
  if (error === 'VIDEO_NOT_READY' || error?.message === 'VIDEO_NOT_READY') {
    return { type: 'not_ready', message: 'La cámara aún no está lista. Esperá un momento.' }
  }
  return { type: 'error', message: error?.message || 'No se pudo abrir la cámara.' }
}
