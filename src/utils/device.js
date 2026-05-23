export function isMobileDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  const ua = navigator.userAgent || ''
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    ua,
  )
  const ios = /iPhone|iPad|iPod/i.test(ua)
  const android = /Android/i.test(ua)
  const touchDevice = navigator.maxTouchPoints > 1
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const narrowViewport = window.matchMedia?.('(max-width: 900px)').matches ?? false

  return Boolean(mobileUa || ios || android || (touchDevice && (coarsePointer || narrowViewport)))
}

/** Cámara nativa obligatoria en mobile; evaluar en runtime, no al importar el módulo. */
export function isNativeCameraOnly() {
  return isMobileDevice()
}
