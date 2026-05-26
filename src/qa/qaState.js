/** Estado runtime QA — mocks, overrides y toggles de paneles. */

const PANELS_SESSION_KEY = 'album-qa-panels'

const DEFAULT_PANELS = {
  gps: false,
  location: false,
}

function readPersistedPanels() {
  if (typeof sessionStorage === 'undefined') {
    return { ...DEFAULT_PANELS }
  }

  try {
    const raw = sessionStorage.getItem(PANELS_SESSION_KEY)
    if (!raw) return { ...DEFAULT_PANELS }
    const parsed = JSON.parse(raw)
    return {
      gps: parsed?.gps === true,
      location: parsed?.location === true,
    }
  } catch {
    return { ...DEFAULT_PANELS }
  }
}

function persistPanels() {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(PANELS_SESSION_KEY, JSON.stringify(qaRuntime.panels))
  } catch {
    // ignore
  }
}

function clearPersistedPanels() {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(PANELS_SESSION_KEY)
  } catch {
    // ignore
  }
}

const qaRuntime = {
  simulateOffline: false,
  mockPosition: null,
  forcePermissionDenied: false,
  simulateCaptureSuccess: false,
  /** null = usar URL/qa; boolean = override desde launcher */
  debugRevealOverride: null,
  panels: readPersistedPanels(),
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
  qaRuntime.panels[panel] = Boolean(visible)
  persistPanels()
  notifyQaRuntimeChange()
}

export function toggleQaPanelVisibility(panel) {
  if (!Object.hasOwn(qaRuntime.panels, panel)) return false
  qaRuntime.panels[panel] = !qaRuntime.panels[panel]
  persistPanels()
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
  clearPersistedPanels()
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
