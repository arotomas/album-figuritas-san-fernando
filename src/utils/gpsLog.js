import { DEBUG_GPS, GPS_ACCEPT_MAX_ACCURACY_M } from '../config/gps'

function shouldLog() {
  return import.meta.env.DEV || DEBUG_GPS
}

function emit(level, label, data) {
  if (!shouldLog()) return
  const method = level === 'warn' ? console.warn : console.info
  if (data !== undefined) {
    method(`[GPS] ${label}`, data)
  } else {
    method(`[GPS] ${label}`)
  }
}

function discardReasonText(reason, accuracy) {
  if (accuracy != null && accuracy > GPS_ACCEPT_MAX_ACCURACY_M) {
    return `accuracy ${Math.round(accuracy)}m > ${GPS_ACCEPT_MAX_ACCURACY_M}m limit`
  }
  return reason ?? 'unknown'
}

function coordsPayload(reading) {
  if (!reading) return null
  return {
    lat: reading.lat,
    lng: reading.lng,
    accuracy: reading.accuracy,
    altitude: reading.altitude ?? null,
    altitudeAccuracy: reading.altitudeAccuracy ?? null,
    speed: reading.speed ?? null,
    heading: reading.heading ?? null,
    timestamp: reading.timestamp ?? null,
  }
}

export const gpsLog = {
  update({ apiSource, reading, outcome, reason, phase }) {
    emit('info', 'update', {
      source: apiSource,
      coords: coordsPayload(reading),
      accuracy: reading?.accuracy ?? null,
      outcome,
      reason: reason ?? null,
      discardReason:
        outcome === 'rejected'
          ? discardReasonText(reason, reading?.accuracy)
          : null,
      phase: phase ?? null,
    })
  },
  rawReading(data) {
    gpsLog.update({
      apiSource: data.apiSource,
      reading: data,
      outcome: 'raw',
      phase: data.phase,
    })
  },
  accepted(data) {
    gpsLog.update({
      apiSource: data.apiSource,
      reading: data,
      outcome: 'accepted',
      phase: data.phase,
    })
  },
  discarded(data) {
    gpsLog.update({
      apiSource: data.apiSource,
      reading: data,
      outcome: 'rejected',
      reason: data.reason,
      phase: data.phase,
    })
  },
  fix: (...args) => {
    if (shouldLog()) console.info('[GPS]', ...args)
  },
  updateMeta: (...args) => {
    if (shouldLog()) console.info('[GPS]', ...args)
  },
  state: (...args) => {
    if (shouldLog()) console.info('[GPS]', ...args)
  },
  discard: (payload) => {
    gpsLog.discarded(payload)
  },
  warn: (...args) => {
    if (shouldLog()) console.warn('[GPS]', ...args)
  },
  error: (...args) => {
    if (shouldLog()) console.warn('[GPS]', ...args)
  },
  requestingInitialFix(data) {
    emit('info', 'requesting initial fix', data)
  },
  initialFixSuccess(data) {
    emit('info', 'initial fix success', data)
  },
  initialFixTimeout(data) {
    emit('warn', 'initial fix timeout', data)
  },
  watchUpdate(data) {
    emit('info', 'watch update', data)
  },
  lastValidFix(data) {
    emit('info', 'last valid fix', data)
  },
  stalledNoUpdates(data) {
    emit('warn', 'stalled/no updates', data)
  },
}
