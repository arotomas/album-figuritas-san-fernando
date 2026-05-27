import { stopMediaStream } from './camera'
import { isMediaStream, mediaTrace } from './mediaTrace'
import { stopVibration } from './vibration'

/** Cancela throttle/debounce creados con performance.js */
export function cancelScheduled(fn) {
  fn?.cancel?.()
}

function resolveStreamFromArg(streamRefOrStream) {
  if (streamRefOrStream == null) return null

  if (typeof streamRefOrStream === 'object' && 'current' in streamRefOrStream) {
    return streamRefOrStream.current ?? null
  }

  if (isMediaStream(streamRefOrStream)) {
    return streamRefOrStream
  }

  return null
}

export function cleanupMediaStream(streamRef, videoRef, { source = 'unknown' } = {}) {
  const stream = resolveStreamFromArg(streamRef)
  const isRefObject =
    streamRef != null && typeof streamRef === 'object' && 'current' in streamRef

  mediaTrace('cleanupMediaStream', {
    source,
    isRefObject,
    hadStream: Boolean(stream),
    streamRef,
    videoRef,
  })

  if (streamRef != null && !isRefObject && !isMediaStream(streamRef)) {
    mediaTrace('cleanupMediaStream — invalid streamRef arg (ignored)', {
      source,
      typeof: typeof streamRef,
      constructorName: streamRef?.constructor?.name ?? null,
    })
  }

  stopMediaStream(stream, { source: `cleanup:${source}` })

  if (isRefObject) {
    streamRef.current = null
  }

  const video = videoRef?.current ?? null
  if (video) {
    video.srcObject = null
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
