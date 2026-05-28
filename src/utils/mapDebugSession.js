/**
 * Acumulador de evidencia para QA móvil — rama diagnostic solamente.
 * Consola: __mapDebug.sessionReport()
 */

const MAX_EVENTS = 80

export const mapDebugSession = {
  startedAt: typeof performance !== 'undefined' ? performance.now() : Date.now(),
  gestureActive: false,
  lastGesture: null,
  counts: {
    invalidateSize: 0,
    flyTo: 0,
    panTo: 0,
    setView: 0,
    fitBounds: 0,
    viewportUpdate: 0,
    bearing: 0,
    rotation: 0,
    autoFollow: 0,
  },
  events: [],
}

export function recordMapDebugSession(category, message, detail) {
  const key = category in mapDebugSession.counts ? category : null
  if (key) mapDebugSession.counts[key] += 1

  mapDebugSession.events.push({
    t: Math.round((performance?.now?.() ?? Date.now()) - mapDebugSession.startedAt),
    category,
    message,
    gestureActive: mapDebugSession.gestureActive,
    lastGesture: mapDebugSession.lastGesture,
    detail: detail ?? null,
  })

  if (mapDebugSession.events.length > MAX_EVENTS) {
    mapDebugSession.events.shift()
  }
}

export function setMapDebugGesturePhase(phase) {
  mapDebugSession.lastGesture = phase
  mapDebugSession.gestureActive =
    phase === 'drag' || phase === 'pinch' || phase === 'zoom' || phase === 'move'
}

export function resetMapDebugSession() {
  mapDebugSession.startedAt = performance?.now?.() ?? Date.now()
  mapDebugSession.gestureActive = false
  mapDebugSession.lastGesture = null
  Object.keys(mapDebugSession.counts).forEach((k) => {
    mapDebugSession.counts[k] = 0
  })
  mapDebugSession.events = []
}

export function formatMapDebugSessionReport() {
  const lines = [
    '=== MAP MOBILE QA SESSION ===',
    `durationMs: ${Math.round((performance?.now?.() ?? Date.now()) - mapDebugSession.startedAt)}`,
    `gestureActive: ${mapDebugSession.gestureActive}`,
    `lastGesture: ${mapDebugSession.lastGesture ?? 'none'}`,
    'counts:',
    ...Object.entries(mapDebugSession.counts).map(([k, v]) => `  ${k}: ${v}`),
    '--- last events ---',
    ...mapDebugSession.events.slice(-15).map(
      (e) =>
        `[${e.t}ms] ${e.category} | ${e.message} | gesture=${e.gestureActive ? e.lastGesture : 'idle'}`,
    ),
  ]
  return lines.join('\n')
}

if (typeof window !== 'undefined') {
  window.__mapDebugSession = mapDebugSession
  window.__mapDebugFormatSession = formatMapDebugSessionReport
  window.__mapDebugResetSession = resetMapDebugSession
}
