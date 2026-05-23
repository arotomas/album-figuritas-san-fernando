export function isMobileDevice() {
  if (typeof window === 'undefined') return false

  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches
  const narrowViewport = window.matchMedia?.('(max-width: 768px)').matches
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  )

  return Boolean(coarsePointer || narrowViewport || mobileUa)
}
