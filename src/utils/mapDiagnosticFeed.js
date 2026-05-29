const MAX_ENTRIES = 20

/** @type {Array<object>} */
let entries = []
const listeners = new Set()

export function pushMapDiagnosticEvent(entry) {
  const row = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    iso: new Date().toISOString(),
    ...entry,
  }
  entries = [row, ...entries].slice(0, MAX_ENTRIES)
  listeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // ignore
    }
  })
}

export function getMapDiagnosticEntries() {
  return entries
}

export function subscribeMapDiagnosticFeed(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function formatDiagnosticCenter(value) {
  if (value == null) return '—'
  if (typeof value === 'string') {
    return value.length > 28 ? `${value.slice(0, 28)}…` : value
  }
  if (typeof value === 'object' && value.lat != null && value.lng != null) {
    const lat = Number(value.lat).toFixed(5)
    const lng = Number(value.lng).toFixed(5)
    const zoom = value.zoom != null ? `@${value.zoom}` : ''
    return `${lat},${lng}${zoom}`
  }
  try {
    const text = JSON.stringify(value)
    return text.length > 32 ? `${text.slice(0, 32)}…` : text
  } catch {
    return String(value)
  }
}

export function shortSite(site) {
  if (!site || site === 'unknown') return 'unknown'
  const match = site.match(/([^/]+\.(jsx|js))(?::|$)/)
  if (match) {
    const fnMatch = site.match(/at\s+(\S+)/)
    return fnMatch ? `${match[1]} ${fnMatch[1]}` : match[1]
  }
  return site.length > 36 ? `${site.slice(0, 36)}…` : site
}

export function formatDiagnosticTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${ms}`
}
