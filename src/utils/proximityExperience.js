import {
  PROXIMITY_PHASES,
  PROXIMITY_RARITY_CONFIG,
} from '../config/proximity'
import { getRarity } from '../theme/rarity'

export function normalizeFigureRarity(figure) {
  const raw = String(figure?.rareza ?? figure?.rarity ?? 'común')
    .trim()
    .toLowerCase()
  if (raw === 'epica' || raw === 'epic') return 'épica'
  if (raw === 'legendary') return 'legendaria'
  if (raw === 'common') return 'común'
  return PROXIMITY_RARITY_CONFIG[raw] ? raw : 'común'
}

export function getProximityRadii(figure) {
  const rarity = normalizeFigureRarity(figure)
  const config = PROXIMITY_RARITY_CONFIG[rarity]
  return {
    rarity,
    detectionMeters: config.detectionMeters,
    captureMeters: config.captureMeters,
    exitMeters: config.detectionMeters + config.exitBufferMeters,
  }
}

/** Progreso bruto del aro: 0 en borde de detección → 1 en radio de captura. */
export function computeRawRingProgress(distanceMeters, detectionMeters, captureMeters) {
  if (distanceMeters == null || !Number.isFinite(distanceMeters)) return 0
  if (distanceMeters > detectionMeters) return 0
  if (distanceMeters <= captureMeters) return 1

  const span = detectionMeters - captureMeters
  if (span <= 0) return 1

  const raw = 1 - (distanceMeters - captureMeters) / span
  return Math.min(1, Math.max(0, raw))
}

/** Curva suave: detección lejana apenas perceptible, cierre más rápido. */
export function easeRingProgress(raw) {
  if (raw <= 0) return 0
  if (raw >= 1) return 1
  return 1 - (1 - raw) ** 2.35
}

export function isWithinDetectionRange(distanceMeters, detectionMeters) {
  return distanceMeters != null && distanceMeters <= detectionMeters
}

export function isWithinCaptureRange(distanceMeters, captureMeters) {
  return distanceMeters != null && distanceMeters <= captureMeters
}

export function getProximityPhase(easedProgress, { inDetectionRange, inCaptureRange }) {
  if (!inDetectionRange) return PROXIMITY_PHASES.NONE
  if (inCaptureRange || easedProgress >= 0.995) return PROXIMITY_PHASES.CAPTURE
  if (easedProgress >= 0.72) return PROXIMITY_PHASES.CLOSE
  if (easedProgress >= 0.22) return PROXIMITY_PHASES.MEDIUM
  return PROXIMITY_PHASES.FAR
}

export function compareFigureProximityPriority(a, b) {
  const tierA = getRarity(normalizeFigureRarity(a)).tier
  const tierB = getRarity(normalizeFigureRarity(b)).tier
  if (tierA !== tierB) return tierB - tierA
  return a.distanceMeters - b.distanceMeters
}

export function pickPriorityFigure(figures) {
  if (!figures?.length) return null
  return [...figures].sort(compareFigureProximityPriority)[0]
}

export function buildProximitySnapshot(figure, distanceMeters) {
  if (!figure || distanceMeters == null) return null

  const radii = getProximityRadii(figure)
  const rawProgress = computeRawRingProgress(
    distanceMeters,
    radii.detectionMeters,
    radii.captureMeters,
  )
  const easedProgress = easeRingProgress(rawProgress)
  const inDetectionRange = isWithinDetectionRange(distanceMeters, radii.detectionMeters)
  const inCaptureRange = isWithinCaptureRange(distanceMeters, radii.captureMeters)
  const phase = getProximityPhase(easedProgress, { inDetectionRange, inCaptureRange })

  return {
    ...radii,
    distanceMeters,
    rawProgress,
    easedProgress,
    inDetectionRange,
    inCaptureRange,
    phase,
  }
}

const MAP_HINTS = {
  [PROXIMITY_PHASES.FAR]: 'Hay algo cerca… seguí explorando.',
  [PROXIMITY_PHASES.MEDIUM]: 'La señal se intensifica.',
  [PROXIMITY_PHASES.CLOSE]: 'Estás muy cerca.',
  [PROXIMITY_PHASES.CAPTURE]: '¡Listo para capturar!',
}

const CAMERA_HINTS = {
  [PROXIMITY_PHASES.FAR]: 'Seguí acercándote… la señal es tenue.',
  [PROXIMITY_PHASES.MEDIUM]: 'Vas bien. La presencia se siente más fuerte.',
  [PROXIMITY_PHASES.CLOSE]: 'Casi ahí. Mantenete un momento.',
  [PROXIMITY_PHASES.CAPTURE]: 'Sacá una foto del lugar para desbloquear la figurita.',
}

const BONUS_MAP_HINTS = {
  [PROXIMITY_PHASES.FAR]: 'Algo especial pulsa en la distancia…',
  [PROXIMITY_PHASES.MEDIUM]: 'Un bonus oculto despierta cerca tuyo.',
  [PROXIMITY_PHASES.CLOSE]: 'El descubrimiento está a un paso.',
  [PROXIMITY_PHASES.CAPTURE]: '¡Momento único! Intentá capturarlo.',
}

export function getMapProximityHint(phase, { isBonus = false } = {}) {
  if (phase === PROXIMITY_PHASES.NONE) return null
  if (isBonus) return BONUS_MAP_HINTS[phase] ?? BONUS_MAP_HINTS[PROXIMITY_PHASES.FAR]
  return MAP_HINTS[phase] ?? MAP_HINTS[PROXIMITY_PHASES.FAR]
}

export function getCameraProximityHint(phase, { inCaptureRange = false } = {}) {
  if (inCaptureRange || phase === PROXIMITY_PHASES.CAPTURE) {
    return CAMERA_HINTS[PROXIMITY_PHASES.CAPTURE]
  }
  if (phase === PROXIMITY_PHASES.NONE) {
    return 'Esperando señal del punto…'
  }
  return CAMERA_HINTS[phase] ?? CAMERA_HINTS[PROXIMITY_PHASES.FAR]
}

export function getRingVisualStyle(phase, rarityKey) {
  const rarity = getRarity(rarityKey)
  const base = {
    opacity: 0.2,
    scale: 0.82,
    glowOpacity: 0.08,
    particleIntensity: 0,
    strokeWidth: 4,
  }

  switch (phase) {
    case PROXIMITY_PHASES.FAR:
      return {
        ...base,
        opacity: rarity.tier >= 3 ? 0.12 : 0.22,
        scale: rarity.tier >= 3 ? 0.78 : 0.84,
        glowOpacity: 0.06,
        particleIntensity: rarity.tier >= 2 ? 0.15 : 0.08,
      }
    case PROXIMITY_PHASES.MEDIUM:
      return {
        ...base,
        opacity: 0.48,
        scale: 0.9,
        glowOpacity: 0.18,
        particleIntensity: 0.35,
        strokeWidth: 4.5,
      }
    case PROXIMITY_PHASES.CLOSE:
      return {
        ...base,
        opacity: 0.78,
        scale: 0.96,
        glowOpacity: 0.32,
        particleIntensity: 0.65,
        strokeWidth: 5,
      }
    case PROXIMITY_PHASES.CAPTURE:
      return {
        ...base,
        opacity: 1,
        scale: 1,
        glowOpacity: 0.55,
        particleIntensity: 1,
        strokeWidth: 5.5,
      }
    default:
      return base
  }
}
