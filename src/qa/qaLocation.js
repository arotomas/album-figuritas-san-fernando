import {
  GPS_ACCEPT_MAX_ACCURACY_M,
} from '../config/gps'
import { SAN_FERNANDO_CENTER } from '../data/mockFigures'
import { getPrimaryAreaStatus, isPositionInPlayableArea } from '../geo/geoPolicy'
import { getCollectionList } from '../utils/collectionRegistry'
import { resolveCollectionAvailability } from '../utils/collectionAvailability'
import { getDistanceMeters } from '../utils/geo'
import { isLocationBypassEnabled } from './qaCore'
import { setQaRuntimeFlag } from './qaState'

/** Umbral relajado solo en DEV / QA — no afecta proximidad real (50 m). */
export const QA_ACCEPT_MAX_ACCURACY_M = 500

export const QA_TELEPORT_PRESETS = {
  plaza: {
    label: 'Plaza',
    lat: -34.4428,
    lng: -58.5589,
  },
  demo: {
    label: 'Punto demo',
    lat: SAN_FERNANDO_CENTER[1],
    lng: SAN_FERNANDO_CENTER[0],
  },
}

export function isQaLocationBypassActive() {
  return isLocationBypassEnabled()
}

export function getEffectiveAcceptMaxAccuracyM() {
  return isQaLocationBypassActive()
    ? QA_ACCEPT_MAX_ACCURACY_M
    : GPS_ACCEPT_MAX_ACCURACY_M
}

export function getQaSanFernandoStatus(lat, lng) {
  return getPrimaryAreaStatus(lat, lng)
}

export function isPositionAccuracyAccepted(accuracy) {
  if (accuracy == null || Number.isNaN(accuracy)) return false
  return accuracy <= getEffectiveAcceptMaxAccuracyM()
}

export function isAcceptedGpsPosition(position) {
  if (!position) return false
  if (!isPositionAccuracyAccepted(position.accuracy)) return false
  return isPositionInPlayableArea(position.lat, position.lng)
}

export { isPositionInPlayableArea } from '../geo/geoPolicy'

export function buildQaAvailabilitySummary(context) {
  const collections = getCollectionList()
  let visible = 0

  for (const collection of collections) {
    if (resolveCollectionAvailability(collection, context).visible) {
      visible += 1
    }
  }

  const debug = context?.debugReveal ? ' · debug reveal' : ''
  return `${visible}/${collections.length} colecciones visibles${debug}`
}

export function buildQaTeleportNearFigure(position, figures = []) {
  if (!figures.length) return null

  let nearest = null
  for (const figure of figures) {
    const ref = position ?? { lat: figure.lat, lng: figure.lng }
    const distanceMeters = getDistanceMeters(
      ref.lat,
      ref.lng,
      figure.lat,
      figure.lng,
    )
    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = { figure, distanceMeters }
    }
  }

  if (!nearest) return null

  return {
    label: nearest.figure.nombre ?? 'Figurita',
    lat: nearest.figure.lat,
    lng: nearest.figure.lng,
    figureId: nearest.figure.id,
    offsetMeters: 8,
  }
}

function offsetTowardFigure(fromLat, fromLng, toLat, toLng, standoffMeters = 8) {
  const dist = getDistanceMeters(fromLat, fromLng, toLat, toLng)
  if (dist <= standoffMeters + 1) {
    return { lat: toLat, lng: toLng }
  }

  const ratio = (dist - standoffMeters) / dist
  return {
    lat: fromLat + (toLat - fromLat) * ratio,
    lng: fromLng + (toLng - fromLng) * ratio,
  }
}

export function setQaMockPosition({ lat, lng, accuracy = 12, source = 'qa-teleport' } = {}) {
  if (!isQaLocationBypassActive()) return false
  if (lat == null || lng == null) return false

  setQaRuntimeFlag('mockPosition', {
    lat,
    lng,
    accuracy,
    timestamp: Date.now(),
    source,
  })

  if (import.meta.env.DEV) {
    console.info('[qa-core] mock position', { lat, lng, accuracy, source })
  }

  return true
}

export function teleportQaToPreset(presetKey) {
  const preset = QA_TELEPORT_PRESETS[presetKey]
  if (!preset) return false
  return setQaMockPosition({
    lat: preset.lat,
    lng: preset.lng,
    accuracy: 10,
    source: `qa-${presetKey}`,
  })
}

export function teleportQaNearFigure(figures, { fromPosition = null } = {}) {
  const target = buildQaTeleportNearFigure(fromPosition, figures)
  if (!target) return false

  const ref = fromPosition ?? QA_TELEPORT_PRESETS.demo
  const coords = offsetTowardFigure(ref.lat, ref.lng, target.lat, target.lng, target.offsetMeters)

  return setQaMockPosition({
    lat: coords.lat,
    lng: coords.lng,
    accuracy: 8,
    source: `qa-near-${target.figureId}`,
  })
}

export function clearQaMockPosition() {
  if (!isQaLocationBypassActive()) return false
  setQaRuntimeFlag('mockPosition', null)
  return true
}
