import { getDistanceMeters } from './geo'
import { formatGpsTimestamp, getGpsDiscardLabel, getGpsErrorLabel } from './gpsLabels'
import { loadLastKnownPosition } from './lastKnownPosition'

function formatCoord(value) {
  return value != null ? value.toFixed(5) : '—'
}

function formatOptional(value, suffix = '') {
  if (value == null || Number.isNaN(value)) return '—'
  return `${Math.round(value * 10) / 10}${suffix}`
}

export function findNearestPendingFigure(position, figures) {
  if (!position || !figures?.length) return null

  let nearest = null
  for (const figure of figures) {
    if (figure.obtenida) continue
    const distanceMeters = getDistanceMeters(
      position.lat,
      position.lng,
      figure.lat,
      figure.lng,
    )
    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = { figure, distanceMeters }
    }
  }
  return nearest
}

export function buildGpsDiagnosticReport({
  gps = {},
  geolocationAvailable,
  permission,
  trustedPosition,
  lastSavedPosition,
  proximityNearest,
  rawNearest,
  isNearFigure,
  nearFigure,
}) {
  const reading = gps.lastRawReading ?? gps.previewPosition ?? gps.position
  const lines = [
    '=== Diagnóstico GPS ===',
    `geolocation: ${geolocationAvailable ? 'sí' : 'no'}`,
    `permiso: ${permission ?? 'unknown'}`,
    '',
    '--- Lectura cruda ---',
    `lat: ${formatCoord(reading?.lat)}`,
    `lng: ${formatCoord(reading?.lng)}`,
    `accuracy: ${reading?.accuracy != null ? `${Math.round(reading.accuracy)}m` : '—'}`,
    `altitudeAccuracy: ${formatOptional(reading?.altitudeAccuracy, 'm')}`,
    `speed: ${formatOptional(reading?.speed, ' m/s')}`,
    `heading: ${formatOptional(reading?.heading, '°')}`,
    `timestamp: ${formatGpsTimestamp(reading?.timestamp)}`,
    `apiSource: ${gps.lastApiSource ?? '—'}`,
    '',
    '--- Estado app ---',
    `ubicación aceptada: ${gps.lastFixOutcome === 'accepted' ? 'sí' : 'no'}`,
    `motivo descarte: ${
      gps.lastFixOutcome === 'discarded' && gps.lastDiscarded?.reason
        ? getGpsDiscardLabel(gps.lastDiscarded.reason, gps.lastDiscarded.accuracy)
        : '—'
    }`,
    `última válida guardada: ${
      lastSavedPosition
        ? `${formatCoord(lastSavedPosition.lat)}, ${formatCoord(lastSavedPosition.lng)} (±${Math.round(lastSavedPosition.accuracy ?? 0)}m)`
        : '—'
    }`,
    `posición confiable: ${
      trustedPosition
        ? `${formatCoord(trustedPosition.lat)}, ${formatCoord(trustedPosition.lng)}`
        : '—'
    }`,
    `watch: ${gps.isWatching ? 'activo' : 'inactivo'}`,
    `error: ${getGpsErrorLabel(gps.errorType) ?? '—'}`,
    '',
    '--- Proximidad ---',
    `figurita cercana detectada: ${isNearFigure ? 'sí' : 'no'}`,
    `cercana (proximidad): ${nearFigure?.nombre ?? '—'}`,
    `distancia proximidad: ${
      proximityNearest?.distanceMeters != null
        ? `${Math.round(proximityNearest.distanceMeters)}m`
        : '—'
    }`,
    `figurita más cercana (lectura mapa): ${rawNearest?.figure?.nombre ?? '—'}`,
    `distancia mapa: ${
      rawNearest?.distanceMeters != null ? `${Math.round(rawNearest.distanceMeters)}m` : '—'
    }`,
    `updates: ${gps.updates ?? 0} · descartes: ${gps.discards ?? 0}`,
  ]
  return lines.join('\n')
}

export async function copyGpsDiagnosticReport(report) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(report)
    return true
  }

  const textarea = document.createElement('textarea')
  textarea.value = report
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(textarea)
  return ok
}

export function readSavedPositionForDiagnostics() {
  return loadLastKnownPosition()
}
