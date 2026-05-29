const MAX_ENTRIES = 20

/** Snapshot persistente del último flyTo/panTo (no lo reemplazan move/rotation). */
export const PINNED_API_CALL_HOLD_MS = 120_000

const PINNED_CAMERA_METHODS = new Set(['flyTo', 'panTo'])

/** @type {Array<object>} */
let entries = []
/** @type {object | null} */
let pinnedApiCall = null
let pinnedUntilMs = 0
/** @type {ReturnType<typeof setTimeout> | null} */
let pinnedExpiryTimer = null
const listeners = new Set()

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // ignore
    }
  })
}

/** @type {ReturnType<typeof setInterval> | null} */
let pinnedTickTimer = null

function stopPinnedTick() {
  if (pinnedTickTimer) {
    clearInterval(pinnedTickTimer)
    pinnedTickTimer = null
  }
}

function startPinnedTick() {
  stopPinnedTick()
  pinnedTickTimer = setInterval(() => {
    if (!pinnedApiCall || Date.now() > pinnedUntilMs) {
      stopPinnedTick()
      pinnedApiCall = null
      pinnedUntilMs = 0
      if (pinnedExpiryTimer) {
        clearTimeout(pinnedExpiryTimer)
        pinnedExpiryTimer = null
      }
      notifyListeners()
      return
    }
    notifyListeners()
  }, 1000)
}

function schedulePinnedExpiry() {
  if (pinnedExpiryTimer) clearTimeout(pinnedExpiryTimer)
  const remaining = pinnedUntilMs - Date.now()
  if (!pinnedApiCall || remaining <= 0) {
    pinnedApiCall = null
    pinnedUntilMs = 0
    pinnedExpiryTimer = null
    stopPinnedTick()
    return
  }
  pinnedExpiryTimer = setTimeout(() => {
    pinnedApiCall = null
    pinnedUntilMs = 0
    pinnedExpiryTimer = null
    stopPinnedTick()
    notifyListeners()
  }, remaining)
}

function isPinnedCameraApiCall(entry) {
  return (
    entry.source === 'MAP_CAMERA' &&
    entry.kind === 'api-call' &&
    PINNED_CAMERA_METHODS.has(entry.method)
  )
}

export function buildCameraDiagnosticSnapshot(row) {
  return {
    method: row.method ?? null,
    caller: row.caller ?? 'unknown',
    resolvedFunction: row.resolvedFunction ?? row.originFn ?? 'unknown',
    resolvedFile: row.resolvedFile ?? row.originFile ?? 'unknown',
    bundleFile: row.bundleFile ?? 'unknown',
    bundleLine: row.bundleLine ?? null,
    bundleColumn: row.bundleColumn ?? null,
    before: row.centerBefore ?? null,
    after: row.centerAfter ?? null,
    timestamp: row.iso ?? new Date().toISOString(),
    stack: row.stack ?? '',
  }
}

function pinApiCall(row) {
  const diagnostic = buildCameraDiagnosticSnapshot(row)
  pinnedApiCall = { ...row, diagnostic }
  pinnedUntilMs = Date.now() + PINNED_API_CALL_HOLD_MS
  schedulePinnedExpiry()
  startPinnedTick()
}

function mergeCenterAfter(row) {
  if (!pinnedApiCall || row.kind !== 'center-after-call') return
  if (!PINNED_CAMERA_METHODS.has(pinnedApiCall.method)) return
  if (row.method !== pinnedApiCall.method) return
  pinnedApiCall = {
    ...pinnedApiCall,
    centerAfter: row.centerAfter,
    afterIso: row.iso,
    diagnostic: {
      ...pinnedApiCall.diagnostic,
      after: row.centerAfter ?? null,
    },
  }
}

export function pushMapDiagnosticEvent(entry) {
  const row = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    iso: new Date().toISOString(),
    ...entry,
  }
  entries = [row, ...entries].slice(0, MAX_ENTRIES)

  if (isPinnedCameraApiCall(entry)) {
    pinApiCall(row)
  } else if (
    entry.source === 'MAP_CAMERA' &&
    entry.kind === 'center-after-call' &&
    PINNED_CAMERA_METHODS.has(entry.method)
  ) {
    mergeCenterAfter(row)
  }

  notifyListeners()
}

export function getMapDiagnosticEntries() {
  return entries
}

export function getPinnedApiCall() {
  if (!pinnedApiCall || Date.now() > pinnedUntilMs) return null
  return pinnedApiCall
}

export function getPinnedDiagnosticSnapshot() {
  const pinned = getPinnedApiCall()
  if (!pinned?.diagnostic) return null
  return pinned.diagnostic
}

export function getPinnedDiagnosticJson(pretty = true) {
  const snapshot = getPinnedDiagnosticSnapshot()
  if (!snapshot) return null
  return pretty ? JSON.stringify(snapshot, null, 2) : JSON.stringify(snapshot)
}

export function getPinnedApiCallRemainingMs() {
  if (!pinnedApiCall) return 0
  return Math.max(0, pinnedUntilMs - Date.now())
}

export function subscribeMapDiagnosticFeed(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function formatDiagnosticCenter(value) {
  if (value == null) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value.lat != null && value.lng != null) {
    const lat = Number(value.lat).toFixed(5)
    const lng = Number(value.lng).toFixed(5)
    const zoom = value.zoom != null ? `@${value.zoom}` : ''
    return `${lat},${lng}${zoom}`
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function formatDiagnosticAge(iso) {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return '0ms'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`
}

export function formatDiagnosticTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${ms}`
}
