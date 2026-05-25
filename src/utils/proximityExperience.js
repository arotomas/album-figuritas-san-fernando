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

export const RING_PROGRESS_COLOR = '#8cc63f'
export const RING_BASE_COLOR = 'rgba(255,255,255,0.18)'

const RING_PROGRESS_FEEDBACK_TIERS = [
  { min: 0.97, id: 'detected', message: 'Punto detectado' },
  { min: 0.82, id: 'near', message: 'Estás extremadamente cerca' },
  { min: 0.62, id: 'strong', message: 'La energía es muy fuerte en esta zona' },
  { min: 0.37, id: 'approaching', message: 'Te estás acercando al punto correcto' },
  { min: 0.18, id: 'intensifying', message: 'La señal comienza a intensificarse' },
  { min: 0.08, id: 'weak', message: 'Se detecta una señal débil…' },
]

/** Frase inmersiva según el mismo progreso que alimenta el aro (0–1). */
export function getRingProgressFeedback(progress) {
  const fill = Math.min(1, Math.max(0, progress ?? 0))
  if (fill < RING_PROGRESS_FEEDBACK_TIERS.at(-1).min) return null

  return (
    RING_PROGRESS_FEEDBACK_TIERS.find((tier) => fill >= tier.min) ?? null
  )
}

/** Color y glow del texto: blanco lejos → verde institucional al completar. */
export function getRingProgressFeedbackStyle(progress) {
  const fill = Math.min(1, Math.max(0, progress ?? 0))
  const isPeak = fill >= 0.97
  const mix = isPeak ? 1 : fill ** 0.88

  const r = Math.round(255 + (140 - 255) * mix)
  const g = Math.round(255 + (198 - 255) * mix)
  const b = Math.round(255 + (63 - 255) * mix)

  return {
    isPeak,
    color: isPeak ? RING_PROGRESS_COLOR : `rgb(${r}, ${g}, ${b})`,
    textShadow: isPeak
      ? '0 0 16px rgba(140,198,63,0.7), 0 0 32px rgba(140,198,63,0.35)'
      : `0 0 ${6 + mix * 14}px rgba(${r}, ${g}, ${b}, ${0.12 + mix * 0.28})`,
    opacity: 0.52 + mix * 0.48,
  }
}

/** Glow, marco y partículas según cuánto verde hay en el arco (no el color del trazo). */
export function getRingProximityColors(progress, { isReady = false } = {}) {
  if (isReady) {
    return {
      glow: 'rgba(140,198,63,0.52)',
      glowIntensity: 1,
      particle: RING_PROGRESS_COLOR,
      frameGlow: '0 0 28px rgba(140,198,63,0.5)',
      frameBorder: 'rgba(140,198,63,0.85)',
    }
  }

  const fill = Math.min(1, Math.max(0, progress))
  const glowIntensity = fill ** 1.15

  return {
    glow: `rgba(140,198,63,${0.04 + glowIntensity * 0.36})`,
    glowIntensity,
    particle:
      fill >= 0.35
        ? RING_PROGRESS_COLOR
        : `rgba(255,255,255,${0.32 + fill * 0.42})`,
    frameGlow: `0 0 ${6 + fill * 24}px rgba(140,198,63,${0.06 + fill * 0.34})`,
    frameBorder:
      fill >= 0.8
        ? `rgba(140,198,63,${0.5 + fill * 0.35})`
        : `rgba(255,255,255,${0.2 + fill * 0.3})`,
  }
}
