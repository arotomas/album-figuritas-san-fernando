import { cameraLog } from './cameraLog'

export const CAMERA_CONSTRAINTS = {
  video: { facingMode: { ideal: 'environment' } },
  audio: false,
}

export const BLACK_PREVIEW_TIMEOUT_MS = 2_000

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i

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

export function stopMediaStream(stream) {
  if (!stream) return
  stream.getTracks().forEach((track) => track.stop())
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

function drawBitmapToCanvas(bitmap) {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('CANVAS_CONTEXT_UNAVAILABLE')
  }

  context.drawImage(bitmap, 0, 0)
  return canvas
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) {
        reject(new Error('IMAGE_EMPTY'))
        return
      }

      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight

      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('CANVAS_CONTEXT_UNAVAILABLE'))
        return
      }

      context.drawImage(img, 0, 0)
      resolve(canvas)
    }

    img.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'))
    img.src = url
  })
}

async function loadImageFromFileWithBitmap(file) {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('IMAGE_BITMAP_UNSUPPORTED')
  }

  const bitmap = await createImageBitmap(file)
  try {
    if (!bitmap.width || !bitmap.height) {
      throw new Error('IMAGE_EMPTY')
    }
    return drawBitmapToCanvas(bitmap)
  } finally {
    bitmap.close?.()
  }
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
      // fallback a Image + object URL
    }
  }

  const url = URL.createObjectURL(file)

  try {
    return await loadImageFromUrl(url)
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
