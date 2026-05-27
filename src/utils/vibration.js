import { prefersReducedMotion } from './performance'
import { FIGURE_ALERT_COOLDOWN_MS } from '../config/proximity'
import { PROXIMITY_PHASES } from '../config/proximity'
import { normalizeFigureRarity } from './proximityExperience'

const NEAR_FAR_PATTERN = [40, 120, 40]
const NEAR_MEDIUM_PATTERN = [60, 50, 80]
const NEAR_CLOSE_PATTERN = [80, 40, 100, 40, 120]
const NEAR_CAPTURE_PATTERN = [120, 60, 120, 60, 200]
const READY_PATTERN = [35, 45, 35, 40, 85]
const CAPTURE_PATTERN = [30, 20, 60]
const UNLOCK_PATTERN = [80, 40, 120, 40, 200]
const COLLECTION_COMPLETE_PATTERN = [50, 30, 80, 30, 120]
const ALBUM_SWIPE_PATTERN = [18, 8, 14]

const lastVibrationAt = {
  near: 0,
  ready: 0,
  album: 0,
  pulse: 0,
  collection: 0,
}

const figureAlertCooldowns = new Map()

function canVibrate() {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator
}

function shouldSkipHaptics() {
  return prefersReducedMotion()
}

function vibrateWithCooldown(key, pattern, cooldownMs) {
  if (!canVibrate() || shouldSkipHaptics()) return false

  const now = Date.now()
  if (now - lastVibrationAt[key] < cooldownMs) return false

  lastVibrationAt[key] = now
  navigator.vibrate(pattern)
  return true
}

function patternForPhase(phase, rarity) {
  if (phase === PROXIMITY_PHASES.CAPTURE) return NEAR_CAPTURE_PATTERN
  if (phase === PROXIMITY_PHASES.CLOSE) return NEAR_CLOSE_PATTERN
  if (phase === PROXIMITY_PHASES.MEDIUM) return NEAR_MEDIUM_PATTERN

  if (rarity === 'legendaria' || rarity === 'épica') {
    return [30, 180, 30]
  }
  return NEAR_FAR_PATTERN
}

export function vibrateNearFigure(cooldownMs = FIGURE_ALERT_COOLDOWN_MS) {
  return vibrateWithCooldown('near', NEAR_CAPTURE_PATTERN, cooldownMs)
}

/** Aviso por figurita con cooldown de 2 min y patrón según fase/rareza. */
export function vibrateFigureProximityAlert(figure, phase, cooldownMs = FIGURE_ALERT_COOLDOWN_MS) {
  if (!canVibrate() || shouldSkipHaptics() || !figure?.id) return false
  if (phase === PROXIMITY_PHASES.NONE) return false

  const figureKey = String(figure.id)
  const now = Date.now()
  if (now - (figureAlertCooldowns.get(figureKey) ?? 0) < cooldownMs) return false

  const rarity = normalizeFigureRarity(figure)
  navigator.vibrate(patternForPhase(phase, rarity))
  figureAlertCooldowns.set(figureKey, now)
  lastVibrationAt.near = now
  return true
}

/** Pulso suave mientras se acerca en cámara (cooldown corto). */
export function vibrateProximityPulse(phase, cooldownMs = 8_000) {
  if (phase === PROXIMITY_PHASES.NONE || phase === PROXIMITY_PHASES.CAPTURE) return false
  const pattern =
    phase === PROXIMITY_PHASES.CLOSE
      ? [25, 35, 25]
      : phase === PROXIMITY_PHASES.MEDIUM
        ? [18, 50, 18]
        : [12, 70, 12]
  return vibrateWithCooldown('pulse', pattern, cooldownMs)
}

export function vibrateReady(cooldownMs = 6_000) {
  return vibrateWithCooldown('ready', READY_PATTERN, cooldownMs)
}

export function vibrateCapture() {
  if (!canVibrate() || shouldSkipHaptics()) return
  navigator.vibrate(CAPTURE_PATTERN)
}

export function vibrateUnlock() {
  if (!canVibrate() || shouldSkipHaptics()) return
  navigator.vibrate(UNLOCK_PATTERN)
}

export function vibrateAlbumSwipe() {
  return vibrateWithCooldown('album', ALBUM_SWIPE_PATTERN, 400)
}

export function vibrateCollectionComplete() {
  return vibrateWithCooldown('collection', COLLECTION_COMPLETE_PATTERN, 1200)
}

const RARITY_DISCOVERY_PATTERNS = {
  rara: [14, 22],
  épica: [18, 26, 18],
  legendaria: [22, 30, 22],
}

/** Pulso ceremonial al descubrir una rareza especial en el reveal. */
export function vibrateRarityDiscovery(rareza) {
  if (!canVibrate() || shouldSkipHaptics()) return false
  const key = normalizeFigureRarity({ rareza })
  const pattern = RARITY_DISCOVERY_PATTERNS[key]
  if (!pattern) return false
  navigator.vibrate(pattern)
  return true
}

export function stopVibration() {
  if (canVibrate()) {
    navigator.vibrate(0)
  }
}

export function resetFigureProximityAlerts() {
  figureAlertCooldowns.clear()
}
