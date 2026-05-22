const qaState = {
  simulateOffline: false,
  mockPosition: null,
  forcePermissionDenied: false,
}

const listeners = new Set()

function notifyQaChange() {
  listeners.forEach((fn) => fn())
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('qa-flags-changed'))
  }
}

export function getQaState() {
  return { ...qaState }
}

export function setQaFlag(key, value) {
  if (!(key in qaState)) return
  qaState[key] = value
  notifyQaChange()
}

export function resetQaFlags() {
  qaState.simulateOffline = false
  qaState.mockPosition = null
  qaState.forcePermissionDenied = false
  notifyQaChange()
}

export function subscribeQaState(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function readMemoryDiagnostics() {
  if (typeof performance === 'undefined') return null

  const memory = performance.memory
  if (!memory) return { supported: false }

  return {
    supported: true,
    usedMb: Math.round(memory.usedJSHeapSize / 1024 / 1024),
    totalMb: Math.round(memory.totalJSHeapSize / 1024 / 1024),
    limitMb: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
  }
}

export function measureFpsSample(durationMs = 1000) {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'undefined') {
      resolve(null)
      return
    }

    let frames = 0
    let start = performance.now()
    let rafId = null

    const tick = (now) => {
      frames += 1
      if (now - start >= durationMs) {
        cancelAnimationFrame(rafId)
        resolve(Math.round((frames * 1000) / (now - start)))
        return
      }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
  })
}

export function logDiagnostic(tag, payload) {
  if (import.meta.env.DEV) {
    console.info(`[figuritas:${tag}]`, payload)
  }
}
