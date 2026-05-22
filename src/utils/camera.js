import { cameraLog } from './cameraLog'

export const CAMERA_CONSTRAINTS = {
  video: { facingMode: { ideal: 'environment' } },
  audio: false,
}

export const BLACK_PREVIEW_TIMEOUT_MS = 2_000

export function isCameraSupported() {
  return Boolean(
    typeof navigator !== 'undefined' &&
      navigator.mediaDevices?.getUserMedia,
  )
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
  context.drawImage(video, 0, 0, canvas.width, canvas.height)

  return canvas
}

export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('FILE_MISSING'))
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const context = canvas.getContext('2d')
      context.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      resolve(canvas)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('IMAGE_LOAD_FAILED'))
    }

    img.src = url
  })
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
