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
  const touchDevice = navigator.maxTouchPoints > 0
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const narrowViewport = window.matchMedia?.('(max-width: 1024px)').matches ?? false

  return Boolean(
    mobileUa ||
      ios ||
      android ||
      coarsePointer ||
      (touchDevice && narrowViewport),
  )
}

/** @deprecated Usar cameraCapabilities — embedded first en todos los dispositivos. */
export function isNativeCameraOnly() {
  return false
}
