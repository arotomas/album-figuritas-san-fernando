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

export const gpsLog = {
  rawReading(data) {
    emit('info', 'reading', {
      lat: data.lat,
      lng: data.lng,
      accuracy: data.accuracy,
      timestamp: data.timestamp,
      phase: data.phase,
      source: data.source,
    })
  },
  accepted(data) {
    emit('info', 'accepted', {
      outcome: 'accepted',
      lat: data.lat,
      lng: data.lng,
      accuracy: data.accuracy,
      timestamp: data.timestamp,
      source: data.source,
      phase: data.phase,
    })
  },
  discarded(data) {
    emit('info', 'discarded', {
      outcome: 'discarded',
      lat: data.lat,
      lng: data.lng,
      accuracy: data.accuracy,
      timestamp: data.timestamp,
      reason: data.reason,
      discardReason: discardReasonText(data.reason, data.accuracy),
      source: data.source,
      phase: data.phase,
    })
  },
  fix: (...args) => {
    if (shouldLog()) console.info('[GPS]', ...args)
  },
  update: (...args) => {
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
}
