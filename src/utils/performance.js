export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function usePrefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return prefersReducedMotion()
}

export function throttle(fn, waitMs) {
  let last = 0
  let timer = null

  const throttled = (...args) => {
    const now = Date.now()
    const remaining = waitMs - (now - last)

    if (remaining <= 0) {
      last = now
      fn(...args)
      return
    }

    clearTimeout(timer)
    timer = setTimeout(() => {
      last = Date.now()
      timer = null
      fn(...args)
    }, remaining)
  }

  throttled.cancel = () => {
    clearTimeout(timer)
    timer = null
  }

  return throttled
}

export function debounce(fn, waitMs) {
  let timer = null

  const debounced = (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, waitMs)
  }

  debounced.cancel = () => {
    clearTimeout(timer)
    timer = null
  }

  return debounced
}

export function rafThrottle(fn) {
  let frame = null

  return (...args) => {
    if (frame !== null) return
    frame = requestAnimationFrame(() => {
      frame = null
      fn(...args)
    })
  }
}

export function addPassiveListener(target, event, handler) {
  target.addEventListener(event, handler, { passive: true })
  return () => target.removeEventListener(event, handler)
}

export function gpuLayerClassName(enabled = true) {
  return enabled ? 'gpu-layer' : ''
}
