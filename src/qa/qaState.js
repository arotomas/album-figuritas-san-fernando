/** Estado runtime QA — mocks, overrides y toggles de paneles. */

const DEFAULT_PANELS = {
  gps: null,
  location: null,
}

const qaRuntime = {
  simulateOffline: false,
  mockPosition: null,
  forcePermissionDenied: false,
  simulateCaptureSuccess: false,
  /** null = usar URL/qa; boolean = override desde launcher */
  debugRevealOverride: null,
  panels: { ...DEFAULT_PANELS },
}

const listeners = new Set()

function notifyQaRuntimeChange() {
  listeners.forEach((fn) => fn())
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('qa-flags-changed'))
  }
}

export function getQaRuntimeState() {
  return {
    ...qaRuntime,
    panels: { ...qaRuntime.panels },
  }
}

/** @deprecated alias — prefer getQaRuntimeState */
export function getQaState() {
  return getQaRuntimeState()
}

export function setQaRuntimeFlag(key, value) {
  if (!(key in qaRuntime)) return
  qaRuntime[key] = value
  notifyQaRuntimeChange()
}

/** @deprecated alias */
export function setQaFlag(key, value) {
  setQaRuntimeFlag(key, value)
}

export function setQaPanelVisibility(panel, visible) {
  if (!Object.hasOwn(qaRuntime.panels, panel)) return
  qaRuntime.panels[panel] = visible
  notifyQaRuntimeChange()
}

export function toggleQaPanelVisibility(panel) {
  if (!Object.hasOwn(qaRuntime.panels, panel)) return false
  const current = qaRuntime.panels[panel]
  qaRuntime.panels[panel] = current == null ? true : !current
  notifyQaRuntimeChange()
  return qaRuntime.panels[panel]
}

export function resetQaRuntime() {
  qaRuntime.simulateOffline = false
  qaRuntime.mockPosition = null
  qaRuntime.forcePermissionDenied = false
  qaRuntime.simulateCaptureSuccess = false
  qaRuntime.debugRevealOverride = null
  qaRuntime.panels = { ...DEFAULT_PANELS }
  notifyQaRuntimeChange()
}

/** @deprecated alias */
export function resetQaFlags() {
  resetQaRuntime()
}

export function subscribeQaRuntime(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** @deprecated alias */
export function subscribeQaState(listener) {
  return subscribeQaRuntime(listener)
}
