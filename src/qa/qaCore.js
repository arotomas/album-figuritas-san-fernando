/**
 * Capa única QA/debug/dev — activación, URL params, feature flags y visibilidad.
 * Producción pública: inactivo salvo ?qa=1 o sub-flags explícitas persistidas.
 */

import {
  getQaRuntimeState,
  resetQaRuntime,
  setQaPanelVisibility,
  setQaRuntimeFlag,
  subscribeQaRuntime,
  toggleQaPanelVisibility,
} from './qaState'

export const QA_URL_PARAMS = {
  master: 'qa',
  debugGps: 'debugGps',
  mockLocation: 'mockLocation',
  debugUniverse: 'debugUniverse',
  debugReveal: 'debugReveal',
}

const STORAGE_SESSION_QA = 'album-qa-mode'
const STORAGE_LOCAL_QA = 'album-qa-mode'
const STORAGE_LEGACY_QA = 'figuritas-qa-mode'
const STORAGE_QA_FLAGS = 'album-qa-flags'

const urlFlagListeners = new Set()

let urlFlags = {
  qa: false,
  debugGps: false,
  mockLocation: false,
  debugUniverse: false,
  debugReveal: false,
}

function notifyUrlFlagChange() {
  urlFlagListeners.forEach((fn) => fn())
}

export function subscribeQaUrlFlags(listener) {
  urlFlagListeners.add(listener)
  return () => urlFlagListeners.delete(listener)
}

export function isDevBuild() {
  return import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true'
}

function isViteDebugGps() {
  return import.meta.env.VITE_DEBUG_GPS === 'true'
}

function persistQaMasterFlag() {
  try {
    sessionStorage.setItem(STORAGE_SESSION_QA, '1')
  } catch {
    // ignore
  }
  try {
    localStorage.setItem(STORAGE_LOCAL_QA, '1')
  } catch {
    // ignore
  }
}

function readPersistedQaMasterFlag() {
  try {
    if (sessionStorage.getItem(STORAGE_SESSION_QA) === '1') return true
    if (localStorage.getItem(STORAGE_LOCAL_QA) === '1') return true
    if (sessionStorage.getItem(STORAGE_LEGACY_QA) === '1') {
      persistQaMasterFlag()
      return true
    }
  } catch {
    // ignore
  }
  return false
}

function persistUrlFlags() {
  try {
    sessionStorage.setItem(STORAGE_QA_FLAGS, JSON.stringify(urlFlags))
  } catch {
    // ignore
  }
}

function readPersistedUrlFlags() {
  try {
    const raw = sessionStorage.getItem(STORAGE_QA_FLAGS)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function parseSearchParams(search = '') {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
  return params
}

function applyParamFlags(params) {
  let changed = false

  const readFlag = (key) => params.get(key) === '1'

  if (readFlag(QA_URL_PARAMS.master)) {
    urlFlags = {
      qa: true,
      debugGps: true,
      mockLocation: true,
      debugUniverse: true,
      debugReveal: true,
    }
    persistQaMasterFlag()
    changed = true
  } else {
    const master = readPersistedQaMasterFlag()
    if (master) {
      urlFlags = {
        qa: true,
        debugGps: true,
        mockLocation: true,
        debugUniverse: true,
        debugReveal: true,
      }
      changed = true
    } else {
      const persisted = readPersistedUrlFlags()
      const next = {
        qa: false,
        debugGps: readFlag(QA_URL_PARAMS.debugGps) || Boolean(persisted?.debugGps),
        mockLocation: readFlag(QA_URL_PARAMS.mockLocation) || Boolean(persisted?.mockLocation),
        debugUniverse: readFlag(QA_URL_PARAMS.debugUniverse) || Boolean(persisted?.debugUniverse),
        debugReveal: readFlag(QA_URL_PARAMS.debugReveal) || Boolean(persisted?.debugReveal),
      }

      if (JSON.stringify(next) !== JSON.stringify(urlFlags)) {
        urlFlags = next
        changed = true
      }
    }
  }

  if (changed) {
    persistUrlFlags()
    notifyUrlFlagChange()
  }

  return changed
}

export function activateQaMode({ log = true } = {}) {
  urlFlags = {
    qa: true,
    debugGps: true,
    mockLocation: true,
    debugUniverse: true,
    debugReveal: true,
  }
  persistQaMasterFlag()
  persistUrlFlags()
  notifyUrlFlagChange()
  if (log) {
    console.info('[qa-core] enabled', getQaCoreSnapshot())
  }
  return true
}

/** Shell QA visible: DEV build o sesión ?qa=1 persistida. */
export function isQaShellActive() {
  if (typeof window === 'undefined') return isDevBuild()
  return isDevBuild() || urlFlags.qa || readPersistedQaMasterFlag()
}

/** Sesión QA explícita (?qa=1 o storage). */
export function isQaMasterActive() {
  if (typeof window === 'undefined') return false
  return urlFlags.qa || readPersistedQaMasterFlag()
}

export function syncQaFromUrl(searchString) {
  if (typeof window === 'undefined') return false

  const search =
    searchString ??
    window.location.search ??
    ''

  try {
    return applyParamFlags(parseSearchParams(search))
  } catch {
    return false
  }
}

/** @deprecated alias */
export const syncQaModeFromUrl = syncQaFromUrl

/** @deprecated alias — misma semántica que isQaMasterActive con sync URL */
export function isQaMode(searchString) {
  if (typeof window === 'undefined') return false
  syncQaFromUrl(searchString)
  return isQaMasterActive()
}

export function isDebugGpsEnabled() {
  if (!isQaShellActive()) return false
  return isViteDebugGps() || urlFlags.debugGps || urlFlags.qa
}

export function isDebugGpsLoggingEnabled() {
  return isDevBuild() || isDebugGpsEnabled()
}

export function isLocationBypassEnabled() {
  if (!isQaShellActive()) return false
  return isDevBuild() || urlFlags.mockLocation || urlFlags.qa
}

export function isUniverseDiagnosticsEnabled() {
  if (!isQaShellActive()) return false
  return isDevBuild() || urlFlags.debugUniverse || urlFlags.qa
}

export function isDebugRevealEnabled() {
  if (!isQaShellActive()) return false
  const runtime = getQaRuntimeState()
  if (runtime.debugRevealOverride != null) return runtime.debugRevealOverride
  return urlFlags.debugReveal || urlFlags.qa
}

export function setDebugRevealOverride(value) {
  if (!isQaShellActive()) return false
  setQaRuntimeFlag('debugRevealOverride', value)
  return true
}

export function toggleDebugRevealOverride() {
  const next = !isDebugRevealEnabled()
  return setDebugRevealOverride(next)
}

function resolvePanelVisibility(panelKey, autoEnabled) {
  const override = getQaRuntimeState().panels[panelKey]
  if (override != null) return override
  return autoEnabled
}

export function isGpsPanelVisible() {
  if (!isQaShellActive()) return false
  return resolvePanelVisibility('gps', isDebugGpsEnabled())
}

export function isLocationPanelVisible() {
  if (!isQaShellActive()) return false
  return resolvePanelVisibility('location', isLocationBypassEnabled())
}

export function isQaBadgeVisible() {
  return isQaShellActive()
}

export function canUseTestFigure() {
  return isQaShellActive()
}

export function withQaParam(path, active = isQaMasterActive()) {
  if (!active || typeof path !== 'string') return path

  const [pathname, rawSearch = ''] = path.split('?')
  const params = new URLSearchParams(rawSearch)
  params.set(QA_URL_PARAMS.master, '1')
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function getQaCoreSnapshot() {
  return {
    isShellActive: isQaShellActive(),
    isQaActive: isQaMasterActive(),
    isDevMode: isDevBuild(),
    showQaTools: isQaShellActive(),
    canUseTestFigure: canUseTestFigure(),
    urlFlags: { ...urlFlags },
    features: {
      debugGps: isDebugGpsEnabled(),
      locationBypass: isLocationBypassEnabled(),
      debugUniverse: isUniverseDiagnosticsEnabled(),
      debugReveal: isDebugRevealEnabled(),
      testFigure: canUseTestFigure(),
    },
    panels: {
      gps: isGpsPanelVisible(),
      location: isLocationPanelVisible(),
    },
    runtime: getQaRuntimeState(),
  }
}

export function openQaPanel(panel) {
  if (!isQaShellActive()) return false
  setQaPanelVisibility(panel, true)
  return true
}

export function closeQaPanel(panel) {
  if (!isQaShellActive()) return false
  setQaPanelVisibility(panel, false)
  return true
}

export function toggleQaPanel(panel) {
  if (!isQaShellActive()) return false
  return toggleQaPanelVisibility(panel)
}

export function resetQaAll({ clearStorage = true } = {}) {
  resetQaRuntime()

  urlFlags = {
    qa: false,
    debugGps: false,
    mockLocation: false,
    debugUniverse: false,
    debugReveal: false,
  }

  if (clearStorage && typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(STORAGE_SESSION_QA)
      sessionStorage.removeItem(STORAGE_LEGACY_QA)
      sessionStorage.removeItem(STORAGE_QA_FLAGS)
    } catch {
      // ignore
    }
    try {
      localStorage.removeItem(STORAGE_LOCAL_QA)
    } catch {
      // ignore
    }
  }

  notifyUrlFlagChange()

  if (import.meta.env.DEV) {
    console.info('[qa-core] reset')
  }
}

/** @deprecated alias */
export const isDevMode = isDevBuild
