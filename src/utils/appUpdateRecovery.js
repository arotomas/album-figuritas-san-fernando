import { bootLog, bootWarn } from './bootLog.js'
import { getCapturePipelineSnapshot } from './capturePipelineTrace.js'
import { useAppStore } from '../store/useAppStore.js'

/** Una sola recarga automática por sesión (SW o chunk). */
const RELOAD_GUARD_KEY = 'album-pwa-auto-reload'

const CRITICAL_CAPTURE_PHASES = new Set([
  'capturing',
  'compressing',
  'reward',
  'unlock',
  'photo_updated',
  'done',
])

const DEFER_POLL_MS = 2000
const DEFER_MAX_MS = 45000

let initialized = false
let reloadInFlight = false
let deferPollId = null
let deferMaxId = null

function devLog(message, detail) {
  if (detail !== undefined) bootLog(`pwa-update: ${message}`, detail)
  else bootLog(`pwa-update: ${message}`)
}

function devWarn(message, detail) {
  if (detail !== undefined) bootWarn(`pwa-update: ${message}`, detail)
  else bootWarn(`pwa-update: ${message}`)
}

function hasAutoReloadedThisSession() {
  try {
    return sessionStorage.getItem(RELOAD_GUARD_KEY) === '1'
  } catch {
    return false
  }
}

function markAutoReloaded() {
  try {
    sessionStorage.setItem(RELOAD_GUARD_KEY, '1')
  } catch {
    // private mode / quota
  }
}

export function isChunkLoadError(error) {
  if (!error) return false
  const name = error.name ?? ''
  const message = (error.message ?? String(error)).toLowerCase()
  return (
    name === 'ChunkLoadError' ||
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('importing a module script failed') ||
    message.includes('error loading dynamically imported module')
  )
}

function isCriticalFlowActive() {
  try {
    if (useAppStore.getState().captureSession) return true
  } catch {
    // ignore
  }

  const { phase, captureSession, unlockSubmitted } = getCapturePipelineSnapshot()
  if (unlockSubmitted) return true
  if (captureSession) return true
  if (phase && CRITICAL_CAPTURE_PHASES.has(phase)) return true

  return false
}

function clearDeferredReload() {
  if (deferPollId != null) {
    clearInterval(deferPollId)
    deferPollId = null
  }
  if (deferMaxId != null) {
    clearTimeout(deferMaxId)
    deferMaxId = null
  }
}

function reloadWithCacheBust() {
  const url = new URL(window.location.href)
  url.searchParams.set('_app_reload', String(Date.now()))
  window.location.replace(url.toString())
}

function performAutoReload(reason) {
  if (reloadInFlight || hasAutoReloadedThisSession()) {
    devLog('reload skipped', {
      reason,
      reloadInFlight,
      guarded: hasAutoReloadedThisSession(),
    })
    return
  }

  reloadInFlight = true
  markAutoReloaded()
  clearDeferredReload()
  devLog('auto reload', { reason })
  reloadWithCacheBust()
}

function scheduleDeferredReload(reason) {
  if (deferPollId != null || hasAutoReloadedThisSession() || reloadInFlight) return

  devLog('reload deferred — critical flow', { reason })
  const startedAt = Date.now()

  const attempt = () => {
    if (hasAutoReloadedThisSession() || reloadInFlight) {
      clearDeferredReload()
      return
    }

    const timedOut = Date.now() - startedAt >= DEFER_MAX_MS
    if (!isCriticalFlowActive() || timedOut) {
      if (timedOut) devWarn('deferred reload timeout — forcing', { reason })
      performAutoReload(reason)
    }
  }

  deferPollId = window.setInterval(attempt, DEFER_POLL_MS)
  deferMaxId = window.setTimeout(attempt, DEFER_MAX_MS)
}

function requestAutoReload(reason) {
  if (typeof window === 'undefined') return
  if (hasAutoReloadedThisSession() || reloadInFlight) {
    devLog('reload request ignored', { reason })
    return
  }

  if (isCriticalFlowActive()) {
    scheduleDeferredReload(reason)
    return
  }

  performAutoReload(reason)
}

function onGlobalError(event) {
  if (!isChunkLoadError(event.error)) return
  devLog('chunk error detected (error)', { message: event.error?.message })
  requestAutoReload('chunk-error')
}

function onUnhandledRejection(event) {
  if (!isChunkLoadError(event.reason)) return
  devLog('chunk error detected (rejection)', { message: event.reason?.message })
  event.preventDefault()
  requestAutoReload('chunk-rejection')
}

/**
 * Recarga automática ante nuevo SW o chunks obsoletos post-deploy.
 * Una sola recarga por sesión; difiere si hay captura/recompensa activa.
 */
export function initAppUpdateRecovery() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  devLog('init')

  if ('serviceWorker' in navigator) {
    const hadControllerOnLoad = Boolean(navigator.serviceWorker.controller)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadControllerOnLoad) {
        devLog('controllerchange ignored — first SW install on this load')
        return
      }
      devLog('controllerchange — new service worker active')
      requestAutoReload('service-worker')
    })
  }

  window.addEventListener('error', onGlobalError)
  window.addEventListener('unhandledrejection', onUnhandledRejection)
}
