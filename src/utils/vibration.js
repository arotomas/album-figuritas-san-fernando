import { prefersReducedMotion } from './performance'

const NEAR_FIGURE_PATTERN = [120, 60, 120, 60, 200]
const READY_PATTERN = [40, 30, 40]
const CAPTURE_PATTERN = [30, 20, 60]
const UNLOCK_PATTERN = [80, 40, 120, 40, 200]
const ALBUM_SWIPE_PATTERN = [18, 8, 14]

const lastVibrationAt = {
  near: 0,
  ready: 0,
  album: 0,
}

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

export function vibrateNearFigure(cooldownMs = 12_000) {
  return vibrateWithCooldown('near', NEAR_FIGURE_PATTERN, cooldownMs)
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

export function stopVibration() {
  if (canVibrate()) {
    navigator.vibrate(0)
  }
}
