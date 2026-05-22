let snapshot = null
const listeners = new Set()

export function setGpsDiagnostics(data) {
  snapshot = data
  listeners.forEach((listener) => listener(snapshot))
}

export function getGpsDiagnostics() {
  return snapshot
}

export function subscribeGpsDiagnostics(listener) {
  listeners.add(listener)
  listener(snapshot)
  return () => listeners.delete(listener)
}
