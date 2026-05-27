/**
 * Traza teardown de cámara/stream — solo DEV ([MEDIA]).
 */

function streamSnapshot(stream) {
  if (stream == null) return null
  try {
    return {
      constructor: stream.constructor?.name ?? typeof stream,
      active: stream.active,
      id: stream.id ?? null,
      trackCount:
        typeof stream.getTracks === 'function' ? stream.getTracks().length : null,
    }
  } catch {
    return { constructor: stream?.constructor?.name ?? 'unknown' }
  }
}

function refSnapshot(ref) {
  if (ref == null) return null
  const isRef = typeof ref === 'object' && 'current' in ref
  return {
    isRef,
    currentType: isRef ? typeof ref.current : null,
    currentConstructor: isRef ? ref.current?.constructor?.name ?? null : null,
    hasGetTracksOnCurrent:
      isRef && ref.current != null ? typeof ref.current.getTracks === 'function' : null,
  }
}

export function mediaTrace(message, detail = {}) {
  if (!import.meta.env.DEV) return
  if (detail.stream !== undefined) {
    detail = { ...detail, streamSnapshot: streamSnapshot(detail.stream) }
    delete detail.stream
  }
  if (detail.streamRef !== undefined) {
    detail = { ...detail, streamRefSnapshot: refSnapshot(detail.streamRef) }
    delete detail.streamRef
  }
  if (detail.videoRef !== undefined) {
    const video = detail.videoRef?.current ?? detail.videoRef
    detail = {
      ...detail,
      videoRefSnapshot: video
        ? {
            tagName: video.tagName ?? null,
            readyState: video.readyState ?? null,
            hasSrcObject: Boolean(video.srcObject),
            srcObjectConstructor: video.srcObject?.constructor?.name ?? null,
          }
        : null,
    }
    delete detail.videoRef
  }
  console.info('[MEDIA]', message, detail)
}

export function isMediaStream(value) {
  return value != null && typeof value.getTracks === 'function'
}
