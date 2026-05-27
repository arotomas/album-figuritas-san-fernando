/**
 * Traza temporal del pipeline post-shutter y transición de rutas.
 * Consola [CAPTURE]/[UNLOCK]/[ALBUM]/[ROUTE]/[NAV]/[ERROR]: solo DEV (tree-shaken en prod).
 * Ring buffer + snapshot: DEV vía window.__capturePipeline; prod vía logDiagnostic en errors.
 */

import { logDiagnostic } from './diagnostics'

const MAX_EVENTS = 120
const events = []

let snapshot = {
  phase: null,
  captureSession: null,
  route: null,
  previousRoute: null,
  unlockSubmitted: false,
  rewardFigureId: null,
  mounted: true,
  lastRender: null,
  lastNavigate: null,
  lastRouteEvent: null,
  lastNavEvent: null,
  lastSetState: null,
  lastAsync: null,
  lastUnlock: null,
  lastAlbum: null,
  currentScreen: null,
  finalizeStarted: false,
}

function nowIso() {
  return new Date().toISOString()
}

function safeClone(value) {
  if (value == null) return value
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return String(value)
  }
}

function sessionSummary(session) {
  if (!session) return null
  return {
    figureId: session.figure?.id ?? null,
    mode: session.mode ?? null,
    lockedAt: session.lockedAt ?? null,
    hasLocation: session.locationSnapshot?.lat != null,
  }
}

export function getCapturePipelineSnapshot() {
  return {
    ...snapshot,
    captureSession: sessionSummary(snapshot.captureSession),
    events: events.slice(-40),
  }
}

export function updateCapturePipelineSnapshot(partial) {
  snapshot = { ...snapshot, ...partial }
}

export function setPreviousRoute(path) {
  if (!path || path === snapshot.route) return
  updateCapturePipelineSnapshot({ previousRoute: path })
}

export function updateCurrentRoute(path) {
  if (!path) return
  updateCapturePipelineSnapshot({ route: path })
}

function pushPipelineEvent(category, message, detail, level = 'info') {
  const entry = {
    t: nowIso(),
    ts: performance.now(),
    category,
    message,
    level,
    detail: detail !== undefined ? safeClone(detail) : undefined,
  }

  events.push(entry)
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS)
  }

  if (!import.meta.env.DEV) return

  const prefix = `[${category}]`
  if (level === 'warn') {
    if (detail !== undefined) console.warn(prefix, message, detail)
    else console.warn(prefix, message)
  } else if (detail !== undefined) {
    console.info(prefix, message, detail)
  } else {
    console.info(prefix, message)
  }
}

export function capturePipelineTrace(category, message, detail) {
  pushPipelineEvent(category, message, detail, 'info')
}

export function capturePipelineWarn(category, message, detail) {
  pushPipelineEvent(category, message, detail, 'warn')
}

export function capturePipelineError(error, info = {}, extra = {}) {
  const route =
    typeof window !== 'undefined' ? window.location.pathname + window.location.search : null

  const payload = {
    message: error?.message ?? String(error),
    stack: error?.stack ?? null,
    componentStack: info?.componentStack ?? null,
    currentRoute: route,
    previousRoute: snapshot.previousRoute ?? null,
    lastRouteEvent: snapshot.lastRouteEvent ?? null,
    lastNavEvent: snapshot.lastNavEvent ?? null,
    currentScreen: snapshot.currentScreen ?? null,
    lastUnlock: snapshot.lastUnlock ?? null,
    lastAlbum: snapshot.lastAlbum ?? null,
    ...getCapturePipelineSnapshot(),
    ...extra,
  }

  if (import.meta.env.DEV) {
    pushPipelineEvent('ERROR', error?.message ?? 'unknown', payload, 'warn')
    console.error('[ERROR]', payload)
  } else {
    logDiagnostic('capture-pipeline-error', payload)
  }

  return payload
}

export function tracePhaseChange(from, to, meta) {
  updateCapturePipelineSnapshot({ phase: to, lastSetState: { kind: 'phase', from, to, at: nowIso() } })
  capturePipelineTrace('STATE', 'phase change', { from, to, ...meta })
}

export function traceCaptureSessionChange(nextSession, reason) {
  updateCapturePipelineSnapshot({
    captureSession: nextSession,
    lastSetState: { kind: 'captureSession', reason, at: nowIso() },
  })
  capturePipelineTrace('STATE', 'captureSession change', {
    reason,
    session: sessionSummary(nextSession),
  })
}

export function traceMounted(label, mounted) {
  updateCapturePipelineSnapshot({ mounted })
  capturePipelineTrace('STATE', mounted ? 'mounted' : 'unmounted', { label })
}

export function traceRender(label, detail) {
  updateCapturePipelineSnapshot({ lastRender: { label, at: nowIso(), ...detail } })
  capturePipelineTrace('CAPTURE', `render ${label}`, detail)
}

export function traceNavigate(target, reason) {
  updateCapturePipelineSnapshot({ lastNavigate: { target, reason, at: nowIso() } })
  capturePipelineTrace('CAPTURE', 'navigate', { target, reason })
  routeTrace('navigate (capture)', { target, reason })
}

export function routeTrace(message, detail) {
  const route =
    typeof window !== 'undefined' ? window.location.pathname + window.location.search : null
  updateCapturePipelineSnapshot({
    route,
    lastRouteEvent: { message, at: nowIso(), ...(detail ?? {}) },
  })
  capturePipelineTrace('ROUTE', message, detail)
}

export function navTrace(message, detail) {
  updateCapturePipelineSnapshot({
    lastNavEvent: { message, at: nowIso(), ...(detail ?? {}) },
  })
  capturePipelineTrace('NAV', message, detail)
}

export function traceAsync(label, detail) {
  updateCapturePipelineSnapshot({ lastAsync: { label, at: nowIso(), ...detail } })
  capturePipelineTrace('CAPTURE', `async ${label}`, detail)
}

/** Traza fase final: unlock complete → cleanup → navigate → unmount */
export function unlockTrace(message, detail) {
  updateCapturePipelineSnapshot({
    lastUnlock: { message, at: nowIso(), ...(detail ?? {}) },
  })
  capturePipelineTrace('UNLOCK', message, detail)
}

export function albumTrace(message, detail) {
  updateCapturePipelineSnapshot({
    currentScreen: 'MyFiguresScreen',
    lastAlbum: { message, at: nowIso(), ...(detail ?? {}) },
  })
  capturePipelineTrace('ALBUM', message, detail)
}

export function albumTraceWarn(message, detail) {
  updateCapturePipelineSnapshot({
    currentScreen: 'MyFiguresScreen',
    lastAlbum: { message, at: nowIso(), level: 'warn', ...(detail ?? {}) },
  })
  capturePipelineWarn('ALBUM', message, detail)
}

/** Prefetch lazy reward chunks tras save exitoso (reduce fallo de chunk en mobile). */
export function prefetchRewardChunks() {
  void import('../components/reward/RewardAnimation')
  void import('../components/reward/UnlockAnimation')
  void import('../components/reward/PhotoUpdatedAnimation')
}

/** Prefetch del chunk del álbum (import dinámico compartido con MyFiguresRoute). */
let albumChunkPrefetch = null

export function prefetchMyFiguresChunk() {
  if (!albumChunkPrefetch) {
    routeTrace('album chunk prefetch start')
    albumChunkPrefetch = import('../pages/MyFiguresScreen')
      .then((module) => {
        routeTrace('album chunk prefetch end', {
          hasInner: Boolean(module.MyFiguresScreenInner),
        })
        return module
      })
      .catch((error) => {
        routeTrace('album chunk prefetch failed', { message: error?.message })
        albumChunkPrefetch = null
        throw error
      })
  }
  return albumChunkPrefetch
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__capturePipeline = {
    getSnapshot: getCapturePipelineSnapshot,
  }
}
