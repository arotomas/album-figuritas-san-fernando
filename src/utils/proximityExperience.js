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

export function getRingVisualStyle(phase) {
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
        opacity: 0.38,
        scale: 0.84,
        glowOpacity: 0.1,
        particleIntensity: 0.1,
      }
    case PROXIMITY_PHASES.MEDIUM:
      return {
        ...base,
        opacity: 0.62,
        scale: 0.92,
        glowOpacity: 0.22,
        particleIntensity: 0.4,
        strokeWidth: 4.5,
      }
    case PROXIMITY_PHASES.CLOSE:
      return {
        ...base,
        opacity: 0.86,
        scale: 0.97,
        glowOpacity: 0.36,
        particleIntensity: 0.7,
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

const INSTITUTIONAL_GREEN = { r: 140, g: 198, b: 63 }
const PROXIMITY_WHITE = { r: 255, g: 255, b: 255 }

function mixChannel(from, to, amount) {
  return Math.round(from + (to - from) * amount)
}

/** Color del aro: blanco lejos → verde institucional cerca/captura. */
export function getRingProximityColors(progress, { isReady = false } = {}) {
  if (isReady) {
    return {
      stroke: '#8cc63f',
      glow: 'rgba(140,198,63,0.5)',
      particle: '#8cc63f',
      frameGlow: '0 0 28px rgba(140,198,63,0.5)',
      frameBorder: 'rgba(140,198,63,0.85)',
    }
  }

  const eased = Math.min(1, Math.max(0, progress))
  const mix = eased ** 1.35
  const r = mixChannel(PROXIMITY_WHITE.r, INSTITUTIONAL_GREEN.r, mix)
  const g = mixChannel(PROXIMITY_WHITE.g, INSTITUTIONAL_GREEN.g, mix)
  const b = mixChannel(PROXIMITY_WHITE.b, INSTITUTIONAL_GREEN.b, mix)
  const stroke = `rgb(${r}, ${g}, ${b})`
  const glowAlpha = 0.08 + mix * 0.32

  return {
    stroke,
    glow: `rgba(${r}, ${g}, ${b}, ${glowAlpha})`,
    particle: mix >= 0.55 ? '#8cc63f' : `rgba(255,255,255,${0.45 + mix * 0.35})`,
    frameGlow: `0 0 ${12 + mix * 18}px rgba(${r}, ${g}, ${b}, ${0.12 + mix * 0.28})`,
    frameBorder: `rgba(${r}, ${g}, ${b}, ${0.28 + mix * 0.45})`,
  }
}
