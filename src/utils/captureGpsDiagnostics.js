import { getFixAgeMs } from './gpsFilter'

/** DEV build, o preview con VITE_DEBUG_CAPTURE_GPS=true para consola en iPhone. */
const ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_DEBUG_CAPTURE_GPS === 'true'

const WINDOW_MS = 60_000
const HEARTBEAT_MS = 8_000

/** @type {number[]} */
const gpsFixTimestamps = []

const layerLastAt = {
  gps: 0,
  liveDistance: 0,
  ringDistance: 0,
  display: 0,
}

const layerLastValue = {
  gps: null,
  liveDistance: null,
  ringDistance: null,
  display: null,
}

let sessionId = 0
let sessionActive = false
let lastGpsFixAt = 0
let lastDisplaySkip = null
let lastSmoothInternal = null
let heartbeatTimer = null
let cameraViewOpen = false

function round1(value) {
  if (value == null || !Number.isFinite(value)) return null
  return Math.round(value * 10) / 10
}

function pruneTimestamps(now = Date.now()) {
  while (gpsFixTimestamps.length > 0 && now - gpsFixTimestamps[0] > WINDOW_MS) {
    gpsFixTimestamps.shift()
  }
}

function updatesPerMinute(now = Date.now()) {
  pruneTimestamps(now)
  return gpsFixTimestamps.length
}

function ageSince(ts) {
  if (!ts) return null
  return Math.max(0, Date.now() - ts)
}

function pickStalestLayer(now = Date.now()) {
  const entries = Object.entries(layerLastAt)
    .filter(([, ts]) => ts > 0)
    .map(([layer, ts]) => ({ layer, ageMs: now - ts }))
    .sort((a, b) => b.ageMs - a.ageMs)

  return entries[0] ?? null
}

function inferDiagnosis({
  gpsAgeMs,
  liveDistance,
  ringDistance,
  displayDistance,
  displaySkip,
}) {
  if (gpsAgeMs != null && gpsAgeMs > 5_000) {
    return 'A_gps_stalled'
  }

  if (
    liveDistance != null &&
    ringDistance != null &&
    Math.abs(liveDistance - ringDistance) > 0.5
  ) {
    return 'pipeline_bootstrap_or_mismatch'
  }

  if (
    ringDistance != null &&
    displayDistance != null &&
    Math.abs(ringDistance - displayDistance) > 3 &&
    displaySkip &&
    displaySkip !== 'display_updated'
  ) {
    return 'B_ui_smoothing'
  }

  if (
    ringDistance != null &&
    displayDistance != null &&
    ringDistance !== displayDistance &&
    (!displaySkip || displaySkip === 'bucket_unchanged' || displaySkip.startsWith('throttle_'))
  ) {
    return 'B_ui_smoothing'
  }

  return null
}

function formatLine(fields) {
  const parts = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${value}`)
  console.info(`[CAPTURE_GPS] ${parts.join(' ')}`)
}

function touchLayer(layer, value) {
  layerLastAt[layer] = Date.now()
  layerLastValue[layer] = value
}

function logEvent(event, extra = {}) {
  if (!ENABLED || !sessionActive) return

  const now = Date.now()
  const gpsAgeMs = lastGpsFixAt ? now - lastGpsFixAt : null
  const stalest = pickStalestLayer(now)
  const diagnosis = inferDiagnosis({
    gpsAgeMs,
    liveDistance: layerLastValue.liveDistance,
    ringDistance: layerLastValue.ringDistance,
    displayDistance: layerLastValue.display,
    displaySkip: lastDisplaySkip,
  })

  formatLine({
    event,
    session: sessionId,
    cameraOpen: cameraViewOpen ? 1 : 0,
    age: gpsAgeMs != null ? `${gpsAgeMs}ms` : undefined,
    accuracy: extra.accuracy ?? layerLastValue.gps?.accuracy,
    liveDistance: round1(extra.liveDistance ?? layerLastValue.liveDistance),
    ringDistance: round1(extra.ringDistance ?? layerLastValue.ringDistance),
    displayDistance: round1(extra.displayDistance ?? layerLastValue.display),
    smoothInternal: round1(extra.smoothInternal ?? lastSmoothInternal),
    updatesPerMin: updatesPerMinute(now),
    gpsAge: gpsAgeMs != null ? `${gpsAgeMs}ms` : undefined,
    liveAge:
      layerLastAt.liveDistance > 0 ? `${now - layerLastAt.liveDistance}ms` : undefined,
    ringAge:
      layerLastAt.ringDistance > 0 ? `${now - layerLastAt.ringDistance}ms` : undefined,
    displayAge:
      layerLastAt.display > 0 ? `${now - layerLastAt.display}ms` : undefined,
    stalestLayer: stalest ? `${stalest.layer}(${stalest.ageMs}ms)` : undefined,
    displaySkip: extra.displaySkip ?? lastDisplaySkip ?? undefined,
    diagnosis: extra.diagnosis ?? diagnosis ?? undefined,
  })
}

function logSummary(reason = 'heartbeat') {
  if (!ENABLED || !sessionActive) return
  logEvent(reason, { diagnosis: inferDiagnosis({
    gpsAgeMs: lastGpsFixAt ? Date.now() - lastGpsFixAt : null,
    liveDistance: layerLastValue.liveDistance,
    ringDistance: layerLastValue.ringDistance,
    displayDistance: layerLastValue.display,
    displaySkip: lastDisplaySkip,
  }) })
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

function startHeartbeat() {
  stopHeartbeat()
  if (!ENABLED) return
  heartbeatTimer = setInterval(() => logSummary('heartbeat'), HEARTBEAT_MS)
}

export function captureGpsDiagEnabled() {
  return ENABLED
}

export function captureGpsDiagSetCameraOpen(open) {
  cameraViewOpen = Boolean(open)
  if (!ENABLED || !sessionActive) return
  logEvent(open ? 'camera_open' : 'camera_closed')
}

export function captureGpsDiagStartSession(meta = {}) {
  if (!ENABLED) return
  sessionId += 1
  sessionActive = true
  gpsFixTimestamps.length = 0
  lastGpsFixAt = 0
  lastDisplaySkip = null
  lastSmoothInternal = null
  Object.keys(layerLastAt).forEach((key) => {
    layerLastAt[key] = 0
    layerLastValue[key] = null
  })
  startHeartbeat()
  logEvent('session_start', {
    figureId: meta.figureId ?? null,
    phase: meta.phase ?? null,
    diagnosis: null,
  })
}

export function captureGpsDiagEndSession(reason = 'unmount') {
  if (!ENABLED) return
  logEvent('session_end', { reason, diagnosis: null })
  sessionActive = false
  cameraViewOpen = false
  stopHeartbeat()
}

/** Fix aceptado que alimenta CaptureFlow (trusted / proximity / map). */
export function captureGpsDiagRecordFix({ position, updateCount, source }) {
  if (!ENABLED || !sessionActive || !position) return

  const now = Date.now()
  gpsFixTimestamps.push(now)
  pruneTimestamps(now)
  lastGpsFixAt = now
  touchLayer('gps', position)

  const fixAgeMs = getFixAgeMs(position)

  const prev = layerLastValue.gps
  const moved =
    !prev ||
    prev.lat !== position.lat ||
    prev.lng !== position.lng ||
    prev.timestamp !== position.timestamp

  if (!moved) {
    logEvent('gps_fix_duplicate_coords', {
      accuracy: round1(position.accuracy),
      fixAge: fixAgeMs != null ? `${fixAgeMs}ms` : undefined,
      updateCount,
      source,
      diagnosis: lastGpsFixAt && now - lastGpsFixAt > 5_000 ? 'A_gps_stalled' : null,
    })
    return
  }

  logEvent('gps_fix', {
    accuracy: round1(position.accuracy),
    fixAge: fixAgeMs != null ? `${fixAgeMs}ms` : undefined,
    updateCount,
    source,
    lat: round1(position.lat),
    lng: round1(position.lng),
  })
}

/** Distancias calculadas en useCaptureFlow. */
export function captureGpsDiagRecordPipeline({
  liveDistanceMeters,
  ringDistanceMeters,
  bootstrapDistanceMeters,
  hasLiveGps,
  ringSource,
}) {
  if (!ENABLED || !sessionActive) return

  const prevLive = layerLastValue.liveDistance
  const prevRing = layerLastValue.ringDistance
  const liveChanged =
    liveDistanceMeters != null &&
    (prevLive == null || Math.abs(liveDistanceMeters - prevLive) > 0.05)
  const ringChanged =
    ringDistanceMeters != null &&
    (prevRing == null || Math.abs(ringDistanceMeters - prevRing) > 0.05)

  if (!liveChanged && !ringChanged) return

  if (liveChanged) {
    touchLayer('liveDistance', liveDistanceMeters)
  }
  if (ringChanged) {
    touchLayer('ringDistance', ringDistanceMeters)
  }

  let stallHint = null
  if (liveChanged && !ringChanged && ringSource === 'bootstrap') {
    stallHint = 'ring_on_bootstrap'
  } else if (liveChanged && !ringChanged) {
    stallHint = 'ring_not_following_live'
  }

  logEvent('pipeline', {
    liveDistance: round1(liveDistanceMeters),
    ringDistance: round1(ringDistanceMeters),
    bootstrapDistance: round1(bootstrapDistanceMeters),
    hasLiveGps: hasLiveGps ? 1 : 0,
    ringSource,
    stallHint,
  })
}

/** Capa UI — useSmoothedRingDistance. */
export function captureGpsDiagRecordDisplay({
  inputMeters,
  displayMeters,
  smoothInternal,
  isReady,
  skipReason,
}) {
  if (!ENABLED || !sessionActive) return

  lastDisplaySkip = skipReason ?? null
  lastSmoothInternal = smoothInternal ?? null

  const prevDisplay = layerLastValue.display
  if (displayMeters != null && displayMeters !== prevDisplay) {
    touchLayer('display', displayMeters)
  }

  const inputChanged =
    inputMeters != null && layerLastValue.ringDistance != null && inputMeters !== layerLastValue.ringDistance
  const displayChanged = displayMeters != null && displayMeters !== prevDisplay

  let diagnosis = null
  if (inputChanged && !displayChanged && skipReason && skipReason !== 'display_updated') {
    diagnosis = 'B_ui_smoothing'
  }

  logEvent('display', {
    ringDistance: round1(inputMeters),
    displayDistance: round1(displayMeters),
    smoothInternal: round1(smoothInternal),
    isReady: isReady ? 1 : 0,
    displaySkip: skipReason,
    diagnosis,
  })
}

export function captureGpsDiagGetState() {
  const now = Date.now()
  return {
    sessionId,
    sessionActive,
    cameraViewOpen,
    updatesPerMinute: updatesPerMinute(now),
    lastGpsFixAt,
    gpsAgeMs: lastGpsFixAt ? now - lastGpsFixAt : null,
    layerLastAt: { ...layerLastAt },
    layerLastValue: { ...layerLastValue },
    lastDisplaySkip,
    lastSmoothInternal,
    stalestLayer: pickStalestLayer(now),
  }
}

if (ENABLED && typeof window !== 'undefined') {
  window.__captureGpsDiag = {
    getState: captureGpsDiagGetState,
    summary: () => logSummary('manual'),
  }
}
