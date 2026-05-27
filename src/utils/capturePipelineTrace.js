/**
 * Traza temporal DEV del pipeline post-shutter.
 * Ring buffer + snapshot global para reconstruir secuencia en ErrorBoundary.
 */

const MAX_EVENTS = 120
const events = []

let snapshot = {
  phase: null,
  captureSession: null,
  route: null,
  unlockSubmitted: false,
  rewardFigureId: null,
  mounted: true,
  lastRender: null,
  lastNavigate: null,
  lastSetState: null,
  lastAsync: null,
  lastUnlock: null,
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

export function capturePipelineTrace(category, message, detail) {
  if (!import.meta.env.DEV) return

  const entry = {
    t: nowIso(),
    ts: performance.now(),
    category,
    message,
    detail: detail !== undefined ? safeClone(detail) : undefined,
  }

  events.push(entry)
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS)
  }

  const prefix = `[${category}]`
  if (detail !== undefined) {
    console.info(prefix, message, detail)
  } else {
    console.info(prefix, message)
  }
}

export function capturePipelineWarn(category, message, detail) {
  if (!import.meta.env.DEV) return

  const entry = {
    t: nowIso(),
    ts: performance.now(),
    category,
    message,
    level: 'warn',
    detail: detail !== undefined ? safeClone(detail) : undefined,
  }

  events.push(entry)
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS)
  }

  const prefix = `[${category}]`
  if (detail !== undefined) {
    console.warn(prefix, message, detail)
  } else {
    console.warn(prefix, message)
  }
}

export function capturePipelineError(error, info = {}, extra = {}) {
  const payload = {
    message: error?.message ?? String(error),
    stack: error?.stack ?? null,
    componentStack: info?.componentStack ?? null,
    ...getCapturePipelineSnapshot(),
    ...extra,
  }

  if (import.meta.env.DEV) {
    console.error('[ERROR]', payload)
  } else {
    console.error('[capture-pipeline-error]', payload.message)
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

/** Prefetch lazy reward chunks tras save exitoso (reduce fallo de chunk en mobile). */
export function prefetchRewardChunks() {
  void import('../components/reward/RewardAnimation')
  void import('../components/reward/UnlockAnimation')
  void import('../components/reward/PhotoUpdatedAnimation')
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__capturePipeline = {
    getSnapshot: getCapturePipelineSnapshot,
  }
}
