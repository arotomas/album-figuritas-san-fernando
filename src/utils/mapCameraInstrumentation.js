/**
 * Instrumentación de cámara Leaflet — solo evidencia.
 * Consola: filtrar [MAP_CAMERA]
 */

import { pushMapDiagnosticEvent } from './mapDiagnosticFeed'

const INSTRUMENTED = new WeakSet()

const stats = {
  panTo: 0,
  flyTo: 0,
  flyToBounds: 0,
  setView: 0,
  fitBounds: 0,
  movestart: 0,
  moveend: 0,
  centerChange: 0,
  bySite: {},
}

function siteKeyFromStack(stack) {
  if (!stack) return 'unknown'
  const lines = stack.split('\n').slice(2, 8)
  const appLine = lines.find(
    (line) =>
      line.includes('/src/') &&
      !line.includes('mapCameraInstrumentation'),
  )
  return appLine?.trim() ?? lines[0]?.trim() ?? 'unknown'
}

function serializeArgs(method, args) {
  try {
    if (method === 'fitBounds' || method === 'flyToBounds') {
      const bounds = args[0]
      const options = args[1] ?? {}
      return {
        bounds: bounds?.isValid?.()
          ? {
              southWest: bounds.getSouthWest(),
              northEast: bounds.getNorthEast(),
            }
          : bounds,
        options,
      }
    }
    const center = args[0]
    const latlng =
      center?.lat != null
        ? { lat: center.lat, lng: center.lng }
        : Array.isArray(center)
          ? { lat: center[0], lng: center[1] }
          : center
    return {
      center: latlng,
      zoom: args[1],
      options: args[2] ?? args[1],
    }
  } catch {
    return { raw: String(args) }
  }
}

function centerSnapshot(map) {
  const c = map.getCenter()
  const z = map.getZoom()
  return {
    lat: Math.round(c.lat * 1e6) / 1e6,
    lng: Math.round(c.lng * 1e6) / 1e6,
    zoom: z,
  }
}

function logMapCamera(method, payload) {
  const row = {
    iso: new Date().toISOString(),
    t: Math.round(performance.now()),
    source: 'MAP_CAMERA',
    ...payload,
  }
  console.info('[MAP_CAMERA]', row)
  pushMapDiagnosticEvent(row)
}

function bumpSite(method, stack) {
  const site = siteKeyFromStack(stack)
  const key = `${method} :: ${site}`
  stats.bySite[key] = (stats.bySite[key] ?? 0) + 1
  return site
}

function wrapMapMethod(map, methodName) {
  const original = map[methodName]?.bind(map)
  if (!original) return

  map[methodName] = function mapCameraWrapped(...args) {
    const stack = new Error(`[MAP_CAMERA] ${methodName}`).stack
    const site = bumpSite(methodName, stack)
    stats[methodName] += 1

    const centerBefore = centerSnapshot(map)
    const serializedArgs = serializeArgs(methodName, args)

    logMapCamera(methodName, {
      kind: 'api-call',
      method: methodName,
      site,
      file: site,
      args: serializedArgs,
      centerBefore,
      stack,
    })

    const result = original(...args)

    const centerAfter = centerSnapshot(map)
    if (
      centerBefore.lat !== centerAfter.lat ||
      centerBefore.lng !== centerAfter.lng ||
      centerBefore.zoom !== centerAfter.zoom
    ) {
      stats.centerChange += 1
      logMapCamera(methodName, {
        kind: 'center-after-call',
        method: methodName,
        site,
        centerBefore,
        centerAfter,
        stack,
      })
    }

    return result
  }
}

export function installMapCameraInstrumentation(map) {
  if (!map || INSTRUMENTED.has(map)) return
  INSTRUMENTED.add(map)

  wrapMapMethod(map, 'panTo')
  wrapMapMethod(map, 'flyTo')
  wrapMapMethod(map, 'flyToBounds')
  wrapMapMethod(map, 'setView')
  wrapMapMethod(map, 'fitBounds')

  let lastLoggedCenter = centerSnapshot(map)

  const logMapMoveEvent = (eventName, event) => {
    stats[eventName] += 1
    const center = centerSnapshot(map)
    const stack = new Error(`[MAP_CAMERA] ${eventName}`).stack
    const site = bumpSite(eventName, stack)
    const originalEvent = Boolean(event?.originalEvent)

    logMapCamera(eventName, {
      kind: 'map-event',
      event: eventName,
      site,
      center,
      originalEvent,
      centerDelta:
        eventName === 'moveend' || eventName === 'movestart'
          ? {
              lat: center.lat - lastLoggedCenter.lat,
              lng: center.lng - lastLoggedCenter.lng,
            }
          : undefined,
      stack,
    })

    if (
      center.lat !== lastLoggedCenter.lat ||
      center.lng !== lastLoggedCenter.lng ||
      center.zoom !== lastLoggedCenter.zoom
    ) {
      stats.centerChange += 1
      logMapCamera(eventName, {
        kind: 'center-changed',
        event: eventName,
        centerBefore: lastLoggedCenter,
        centerAfter: center,
        originalEvent,
        stack,
      })
      lastLoggedCenter = center
    }
  }

  map.on('movestart', (event) => logMapMoveEvent('movestart', event))
  map.on('moveend', (event) => logMapMoveEvent('moveend', event))

  if (typeof window !== 'undefined') {
    window.__MAP_CAMERA_STATS__ = stats
    window.__MAP_CAMERA_PRINT_REPORT__ = printMapCameraReport
  }
}

export function getMapCameraStats() {
  return { ...stats, bySite: { ...stats.bySite } }
}

export function printMapCameraReport() {
  const snapshot = getMapCameraStats()
  console.info('[MAP_CAMERA_REPORT]', snapshot)
  console.table(
    Object.entries(snapshot.bySite)
      .sort((a, b) => b[1] - a[1])
      .map(([site, count]) => ({ site, count })),
  )
  return snapshot
}
