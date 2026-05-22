export const CAMERA_CONSTRAINTS = {
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
  audio: false,
}

export function isCameraSupported() {
  return Boolean(
    typeof navigator !== 'undefined' &&
      navigator.mediaDevices?.getUserMedia,
  )
}

/**
 * Solicita stream de cámara trasera (environment).
 * Preparado para reemplazar por wrapper nativo en futuro.
 */
export async function getRearCameraStream() {
  if (!isCameraSupported()) {
    throw new Error('CAMERA_UNSUPPORTED')
  }

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

export function attachStreamToVideo(video, stream) {
  if (!video || !stream) return Promise.resolve()

  video.srcObject = stream
  video.setAttribute('playsinline', 'true')
  video.setAttribute('webkit-playsinline', 'true')
  video.muted = true

  return video.play()
}

export function isPermissionDeniedError(error) {
  return (
    error?.name === 'NotAllowedError' ||
    error?.name === 'PermissionDeniedError' ||
    error?.message === 'Permission denied'
  )
}
