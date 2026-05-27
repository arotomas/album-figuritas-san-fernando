import { cameraLog } from './cameraLog'
import { isMediaStream, mediaTrace } from './mediaTrace'
import { withTimeout } from './withTimeout'

export const CAMERA_CONSTRAINTS = {
  video: { facingMode: { ideal: 'environment' } },
  audio: false,
}

export const BLACK_PREVIEW_TIMEOUT_MS = 2_000
export const IMAGE_LOAD_TIMEOUT_MS = 10_000

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i
const MAX_LOAD_DIMENSION = 2048

export function isCameraSupported() {
  return Boolean(
    typeof navigator !== 'undefined' &&
      navigator.mediaDevices?.getUserMedia,
  )
}

export function isImageFile(file) {
  if (!file) return false
  if (file.type?.startsWith('image/')) return true
  return IMAGE_EXTENSIONS.test(file.name ?? '')
}

export async function queryCameraPermission() {
  if (!navigator.permissions?.query) return 'unknown'

  try {
    const status = await navigator.permissions.query({ name: 'camera' })
    return status.state
  } catch {
    return 'unknown'
  }
}

export function logCameraPermission(state) {
  if (state === 'granted') cameraLog.granted({ state })
  else if (state === 'denied') cameraLog.denied({ state })
  else cameraLog.prompt({ state })
}

/**
 * Solicita stream de cámara trasera (environment).
 */
export async function getRearCameraStream() {
  if (!isCameraSupported()) {
    throw new Error('CAMERA_UNSUPPORTED')
  }

  cameraLog.getUserMediaStart(CAMERA_CONSTRAINTS)
  return navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS)
}

/**
 * Detiene tracks de un MediaStream válido. Ignora null y objetos inválidos (p. ej. ref).
 */
export function stopMediaStream(stream, { source = 'unknown' } = {}) {
  mediaTrace('stopMediaStream called', {
    source,
    typeof: typeof stream,
    constructorName: stream?.constructor?.name ?? null,
    hasGetTracks: typeof stream?.getTracks === 'function',
    stream,
  })

  if (stream == null) return

  if (!isMediaStream(stream)) {
    mediaTrace('stopMediaStream skipped — not a MediaStream', {
      source,
      typeof: typeof stream,
      constructorName: stream?.constructor?.name ?? null,
      hasGetTracks: typeof stream?.getTracks === 'function',
      keys: typeof stream === 'object' ? Object.keys(stream).slice(0, 8) : null,
    })
    return
  }

  stream.getTracks().forEach((track) => {
    try {
      track.stop()
    } catch (error) {
      mediaTrace('track.stop failed', {
        source,
        kind: track?.kind,
        message: error?.message,
      })
    }
  })
}

export function captureFrameFromVideo(video) {
  if (!video?.videoWidth || !video?.videoHeight) {
    throw new Error('VIDEO_NOT_READY')
  }

  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('CANVAS_CONTEXT_UNAVAILABLE')
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas
}

function scaleToMaxDimension(width, height, maxDim = MAX_LOAD_DIMENSION) {
  if (width <= maxDim && height <= maxDim) {
    return { width, height }
  }
  const ratio = Math.min(maxDim / width, maxDim / height)
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  }
}

function drawSourceToCanvas(drawSource, sourceWidth, sourceHeight) {
  const { width, height } = scaleToMaxDimension(sourceWidth, sourceHeight)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('CANVAS_CONTEXT_UNAVAILABLE')
  }

  context.drawImage(drawSource, 0, 0, width, height)
  return canvas
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    let settled = false

    const finish = (handler) => (value) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      handler(value)
    }

    const timer = window.setTimeout(() => {
      img.onload = null
      img.onerror = null
      finish(reject)(new Error('IMAGE_LOAD_TIMEOUT'))
    }, IMAGE_LOAD_TIMEOUT_MS)

    img.onload = finish(() => {
      if (!img.naturalWidth || !img.naturalHeight) {
        reject(new Error('IMAGE_EMPTY'))
        return
      }
      try {
        resolve(
          drawSourceToCanvas(img, img.naturalWidth, img.naturalHeight),
        )
      } catch (error) {
        reject(error)
      }
    })

    img.onerror = finish(() => reject(new Error('IMAGE_LOAD_FAILED')))
    img.src = url
  })
}

async function loadImageFromFileWithBitmap(file) {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('IMAGE_BITMAP_UNSUPPORTED')
  }

  const bitmap = await withTimeout(
    createImageBitmap(file),
    IMAGE_LOAD_TIMEOUT_MS,
    'createImageBitmap',
  )

  try {
    if (!bitmap.width || !bitmap.height) {
      throw new Error('IMAGE_EMPTY')
    }
    return drawSourceToCanvas(bitmap, bitmap.width, bitmap.height)
  } finally {
    bitmap.close?.()
  }
}

function loadImageFromFileWithReader(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    let settled = false

    const finish = (handler) => (value) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      handler(value)
    }

    const timer = window.setTimeout(() => {
      reader.abort()
      finish(reject)(new Error('FILE_READ_TIMEOUT'))
    }, IMAGE_LOAD_TIMEOUT_MS)

    reader.onload = finish(() => {
      if (typeof reader.result !== 'string') {
        reject(new Error('FILE_READ_EMPTY'))
        return
      }
      loadImageFromUrl(reader.result).then(resolve).catch(reject)
    })
    reader.onerror = finish(() => reject(new Error('FILE_READ_FAILED')))
    reader.onabort = finish(() => reject(new Error('FILE_READ_ABORT')))
    reader.readAsDataURL(file)
  })
}

/**
 * Convierte un File de cámara nativa en canvas listo para comprimir.
 */
export async function loadImageFromFile(file) {
  if (!file) {
    throw new Error('FILE_MISSING')
  }

  if (!isImageFile(file)) {
    throw new Error('FILE_NOT_IMAGE')
  }

  if (file.size <= 0) {
    throw new Error('FILE_EMPTY')
  }

  if (typeof createImageBitmap === 'function') {
    try {
      return await loadImageFromFileWithBitmap(file)
    } catch {
      // fallback
    }
  }

  const url = URL.createObjectURL(file)

  try {
    return await loadImageFromUrl(url)
  } catch {
    return loadImageFromFileWithReader(file)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function isBlackVideoPreview(video) {
  if (!video) return true
  if (!video.videoWidth || !video.videoHeight) return true
  if (video.readyState < 2) return true
  return false
}

export async function attachStreamToVideo(video, stream) {
  if (!video || !stream) return

  cameraLog.streamReady({
    tracks: stream.getVideoTracks().length,
    label: stream.getVideoTracks()[0]?.label ?? null,
  })

  video.srcObject = stream
  video.muted = true
  video.playsInline = true
  video.setAttribute('playsinline', 'true')
  video.setAttribute('webkit-playsinline', 'true')
  video.autoplay = true

  await new Promise((resolve) => {
    if (video.readyState >= 1 && video.videoWidth > 0) {
      resolve()
      return
    }

    const onLoaded = () => {
      video.removeEventListener('loadedmetadata', onLoaded)
      resolve()
    }

    video.addEventListener('loadedmetadata', onLoaded)

    window.setTimeout(() => {
      video.removeEventListener('loadedmetadata', onLoaded)
      resolve()
    }, 3_000)
  })

  cameraLog.metadataLoaded({
    readyState: video.readyState,
    width: video.videoWidth,
    height: video.videoHeight,
  })

  try {
    await video.play()
  } catch (error) {
    cameraLog.warn('video play failed', { message: error?.message })
  }

  cameraLog.dimensions({
    width: video.videoWidth,
    height: video.videoHeight,
    paused: video.paused,
    readyState: video.readyState,
  })
}

export function isPermissionDeniedError(error) {
  return (
    error?.name === 'NotAllowedError' ||
    error?.name === 'PermissionDeniedError' ||
    error?.message === 'Permission denied'
  )
}
