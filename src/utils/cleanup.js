import { stopMediaStream } from './camera'
import { stopVibration } from './vibration'

/** Cancela throttle/debounce creados con performance.js */
export function cancelScheduled(fn) {
  fn?.cancel?.()
}

export function cleanupMediaStream(streamRef, videoRef) {
  stopMediaStream(streamRef?.current ?? streamRef)
  if (streamRef && typeof streamRef === 'object' && 'current' in streamRef) {
    streamRef.current = null
  }
  if (videoRef?.current) {
    videoRef.current.srcObject = null
  }
}

export function cleanupTimers(timerIds) {
  timerIds.forEach((id) => {
    if (id != null) clearTimeout(id)
  })
}

export function cleanupRaf(rafIdRef) {
  if (rafIdRef?.current != null) {
    cancelAnimationFrame(rafIdRef.current)
    rafIdRef.current = null
  }
}

/** Limpieza al salir de flujos intensivos (cámara, mapa activo) */
export function cleanupInteractiveSession({ streamRef, videoRef, throttledFn } = {}) {
  stopVibration()
  cancelScheduled(throttledFn)
  if (streamRef || videoRef) {
    cleanupMediaStream(streamRef, videoRef)
  }
}

export function createAbortCleanup(abortController) {
  return () => abortController?.abort()
}
