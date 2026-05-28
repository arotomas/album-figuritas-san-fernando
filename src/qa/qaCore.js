/**
 * Capa única QA/debug/dev — activación, URL params, feature flags y visibilidad.
 * Producción pública: inactivo salvo rol privilegiado, ?qa=1 en sesión o tester whitelist.
 */

import { isAdminProfile } from '../utils/roles'
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
const STORAGE_LEGACY_QA = 'figuritas-qa-mode'
const STORAGE_LOCAL_QA = 'album-qa-mode'
const STORAGE_QA_FLAGS = 'album-qa-flags'

let qaAccessContext = {
  profile: null,
  userId: null,
  email: null,
}

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

export function isViteDev() {
  return import.meta.env.DEV
}

/** Build de desarrollo/staging — no habilita shell QA en prod por sí solo. */
export function isDevBuild() {
  return import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true'
}

export function setQaAccessContext({ profile, userId, email } = {}) {
  qaAccessContext = {
    profile: profile ?? null,
    userId: userId ?? null,
    email: email ?? null,
  }
  clearQaSessionForNonStaff()
  notifyUrlFlagChange()
}

function isQaTesterWhitelisted() {
  const raw = import.meta.env.VITE_QA_TESTER_IDS?.trim()
  if (!raw) return false

  const tokens = raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
  if (!tokens.length) return false

  const userId = String(qaAccessContext.userId ?? '').toLowerCase()
  const email = String(qaAccessContext.email ?? '').toLowerCase()
  return tokens.some((token) => token === userId || token === email)
}

/** Admin, super admin o testers en whitelist — no jugadores ni moderadores. */
function canUseQaShell() {
  return isAdminProfile(qaAccessContext.profile) || isQaTesterWhitelisted()
}

function clearQaSessionForNonStaff() {
  if (isViteDev() || canUseQaShell()) return

  urlFlags = {
    qa: false,
    debugGps: false,
    mockLocation: false,
    debugUniverse: false,
    debugReveal: false,
  }

  try {
    sessionStorage.removeItem(STORAGE_SESSION_QA)
    sessionStorage.removeItem(STORAGE_LEGACY_QA)
    sessionStorage.removeItem(STORAGE_QA_FLAGS)
  } catch {
    // ignore
  }
}

function purgeLegacyLocalStorageQa() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_LOCAL_QA)
    localStorage.removeItem(STORAGE_LEGACY_QA)
  } catch {
    // ignore
  }
}

function readSessionQaFlag() {
  try {
    return sessionStorage.getItem(STORAGE_SESSION_QA) === '1'
  } catch {
    return false
  }
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
}

function readPersistedQaMasterFlag() {
  if (!isViteDev() && !canUseQaShell()) return false

  if (readSessionQaFlag()) return true

  try {
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

  const staffOrDev = isViteDev() || canUseQaShell()

  if (readFlag(QA_URL_PARAMS.master) && staffOrDev) {
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
      const persisted = staffOrDev ? readPersistedUrlFlags() : null
      const next = {
        qa: false,
        debugGps:
          staffOrDev &&
          (readFlag(QA_URL_PARAMS.debugGps) || Boolean(persisted?.debugGps)),
        mockLocation:
          staffOrDev &&
          (readFlag(QA_URL_PARAMS.mockLocation) || Boolean(persisted?.mockLocation)),
        debugUniverse:
          staffOrDev &&
          (readFlag(QA_URL_PARAMS.debugUniverse) || Boolean(persisted?.debugUniverse)),
        debugReveal:
          staffOrDev &&
          (readFlag(QA_URL_PARAMS.debugReveal) || Boolean(persisted?.debugReveal)),
      }

      if (JSON.stringify(next) !== JSON.stringify(urlFlags)) {
        urlFlags = next
        changed = true
      }
    }
  }

  if (!staffOrDev) {
    clearQaSessionForNonStaff()
  }

  if (changed) {
    persistUrlFlags()
    notifyUrlFlagChange()
  }

  return changed
}

export function activateQaMode({ log = true } = {}) {
  if (!isViteDev() && !canUseQaShell()) return false

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

/** Shell QA: solo Vite DEV, admin/super admin o testers whitelist. */
export function isQaShellActive() {
  if (typeof window === 'undefined') return isViteDev()
  if (isViteDev()) return true
  if (!canUseQaShell()) return false
  return true
}

/** Indica si el perfil actual puede ver herramientas QA (para UI condicional). */
export function isQaStaffUser() {
  return isViteDev() || canUseQaShell()
}

/** QA master activo — mismo gate que shell para prod pública. */
export function isQaMasterActive() {
  return isQaShellActive()
}

export function syncQaFromUrl(searchString) {
  if (typeof window === 'undefined') return false

  purgeLegacyLocalStorageQa()

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
  return isViteDev() || isDebugGpsEnabled()
}

export function isLocationBypassEnabled() {
  if (!isQaShellActive()) return false
  if (isViteDev()) return true
  return urlFlags.mockLocation || urlFlags.qa
}

export function isUniverseDiagnosticsEnabled() {
  if (!isQaShellActive()) return false
  if (isViteDev()) return true
  return urlFlags.debugUniverse || urlFlags.qa
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

function resolvePanelVisibility(panelKey) {
  return getQaRuntimeState().panels[panelKey] === true
}

export function isGpsPanelVisible() {
  if (!isQaShellActive()) return false
  return resolvePanelVisibility('gps')
}

export function isLocationPanelVisible() {
  if (!isQaShellActive()) return false
  return resolvePanelVisibility('location')
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
