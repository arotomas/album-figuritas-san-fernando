const MAX_ENTRIES = 20
export const PINNED_API_CALL_HOLD_MS = 15_000

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

function pinApiCall(row) {
  pinnedApiCall = row
  pinnedUntilMs = Date.now() + PINNED_API_CALL_HOLD_MS
  schedulePinnedExpiry()
  startPinnedTick()
}

function mergeCenterAfter(row) {
  if (!pinnedApiCall || row.kind !== 'center-after-call') return
  if (row.method !== pinnedApiCall.method) return
  pinnedApiCall = {
    ...pinnedApiCall,
    centerAfter: row.centerAfter,
    afterIso: row.iso,
  }
}

export function pushMapDiagnosticEvent(entry) {
  const row = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    iso: new Date().toISOString(),
    ...entry,
  }
  entries = [row, ...entries].slice(0, MAX_ENTRIES)

  if (entry.source === 'MAP_CAMERA' && entry.kind === 'api-call') {
    pinApiCall(row)
  } else if (entry.source === 'MAP_CAMERA' && entry.kind === 'center-after-call') {
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

export function formatDiagnosticTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${ms}`
}
