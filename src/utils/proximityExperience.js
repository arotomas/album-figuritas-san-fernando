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

/** Curva analógica: casi imperceptible lejos, tira suave cerca, aterriza sin snap. */
export function easeRingProgress(raw) {
  if (raw <= 0) return 0
  if (raw >= 1) return 1
  const approach = 1 - (1 - raw) ** 1.72
  const pull = raw ** 2.15
  return approach * 0.62 + pull * 0.38
}

export function isWithinDetectionRange(distanceMeters, detectionMeters) {
  return distanceMeters != null && distanceMeters <= detectionMeters
}

export function isWithinCaptureRange(distanceMeters, captureMeters) {
  return distanceMeters != null && distanceMeters <= captureMeters
}

/** Histéresis de salida para evitar parpadeo en el borde de captura. */
export function isWithinCaptureRangeHysteresis(
  distanceMeters,
  captureMeters,
  wasInRange,
  exitScale = 1.15,
) {
  if (distanceMeters == null || captureMeters == null) return false
  if (wasInRange) return distanceMeters <= captureMeters * exitScale
  return distanceMeters <= captureMeters
}

export function getProximityPhase(
  easedProgress,
  { inDetectionRange, inCaptureRange, visualMode = false } = {},
) {
  if (!inDetectionRange) return PROXIMITY_PHASES.NONE

  const progress = Math.min(1, Math.max(0, easedProgress ?? 0))

  if (visualMode) {
    if (progress >= 0.9 || (inCaptureRange && progress >= 0.76)) {
      return PROXIMITY_PHASES.CAPTURE
    }
    if (progress >= 0.62) return PROXIMITY_PHASES.CLOSE
    if (progress >= 0.14) return PROXIMITY_PHASES.MEDIUM
    return PROXIMITY_PHASES.FAR
  }

  if (inCaptureRange || progress >= 0.995) return PROXIMITY_PHASES.CAPTURE
  if (progress >= 0.72) return PROXIMITY_PHASES.CLOSE
  if (progress >= 0.22) return PROXIMITY_PHASES.MEDIUM
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

/** Active target wins; otherwise nearest-by-priority (legacy behavior). */
export function resolveProximityFocus({
  figuresWithDistance,
  nearFigures,
  activeTargetFigureId,
}) {
  const priorityNearFigure = pickPriorityFigure(nearFigures)

  if (!activeTargetFigureId) {
    return {
      focusFigure: priorityNearFigure,
      secondaryNearFigure: null,
      isFocusNear: Boolean(priorityNearFigure),
    }
  }

  const active = figuresWithDistance.find(
    (figure) => String(figure.id) === String(activeTargetFigureId),
  )

  if (!active || active.obtenida) {
    return {
      focusFigure: priorityNearFigure,
      secondaryNearFigure: null,
      isFocusNear: Boolean(priorityNearFigure),
      activeTargetStale: true,
    }
  }

  const othersNear = nearFigures.filter(
    (figure) => String(figure.id) !== String(activeTargetFigureId),
  )

  return {
    focusFigure: active,
    secondaryNearFigure: pickPriorityFigure(othersNear),
    isFocusNear: nearFigures.some(
      (figure) => String(figure.id) === String(activeTargetFigureId),
    ),
  }
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
  [PROXIMITY_PHASES.FAR]: 'Algo te llama desde acá…',
  [PROXIMITY_PHASES.MEDIUM]: 'Cada paso cuenta.',
  [PROXIMITY_PHASES.CLOSE]: 'Ya casi estás.',
  [PROXIMITY_PHASES.CAPTURE]: 'Este es el momento.',
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
    opacity: 0.18,
    scale: 0.82,
    glowOpacity: 0.06,
    particleIntensity: 0,
    strokeWidth: 4,
  }

  switch (phase) {
    case PROXIMITY_PHASES.FAR:
      return {
        ...base,
        opacity: 0.34,
        scale: 0.84,
        glowOpacity: 0.08,
        particleIntensity: 0.08,
      }
    case PROXIMITY_PHASES.MEDIUM:
      return {
        ...base,
        opacity: 0.56,
        scale: 0.9,
        glowOpacity: 0.16,
        particleIntensity: 0.28,
        strokeWidth: 4.5,
      }
    case PROXIMITY_PHASES.CLOSE:
      return {
        ...base,
        opacity: 0.78,
        scale: 0.96,
        glowOpacity: 0.28,
        particleIntensity: 0.5,
        strokeWidth: 5,
      }
    case PROXIMITY_PHASES.CAPTURE:
      return {
        ...base,
        opacity: 1,
        scale: 1,
        glowOpacity: 0.42,
        particleIntensity: 0.72,
        strokeWidth: 5.5,
      }
    default:
      return base
  }
}

export const RING_PROGRESS_COLOR = '#8cc63f'
export const RING_BASE_COLOR = 'rgba(255,255,255,0.18)'

const RING_PROGRESS_FEEDBACK_TIERS = [
  { min: 0.97, id: 'detected', message: 'El lugar te reconoce' },
  { min: 0.82, id: 'near', message: 'Estás en el umbral' },
  { min: 0.62, id: 'strong', message: 'Se siente cerca' },
  { min: 0.37, id: 'approaching', message: 'Vas bien' },
  { min: 0.18, id: 'intensifying', message: 'Algo despierta' },
  { min: 0.08, id: 'weak', message: 'Una señal lejana…' },
]

/** Frase inmersiva según el mismo progreso que alimenta el aro (0–1). */
export function getRingProgressFeedback(progress) {
  const fill = Math.min(1, Math.max(0, progress ?? 0))
  if (fill < RING_PROGRESS_FEEDBACK_TIERS.at(-1).min) return null

  return (
    RING_PROGRESS_FEEDBACK_TIERS.find((tier) => fill >= tier.min) ?? null
  )
}

/** Distancia restante para el centro del anillo — tono claro, no técnico. */
export function formatProximityDistanceLabel(meters, { isReady = false } = {}) {
  if (isReady || (meters != null && meters <= 8)) {
    return { mode: 'arrived', primary: 'Estás ahí', secondary: null }
  }
  if (meters == null || !Number.isFinite(meters)) {
    return null
  }

  if (meters > 999) {
    const km = meters / 1000
    const text = km >= 10 ? `${Math.round(km)} km` : `${km.toFixed(1).replace(/\.0$/, '')} km`
    return { mode: 'far', primary: 'Faltan', secondary: text }
  }

  return { mode: 'meters', primary: 'Faltan', secondary: `${Math.max(1, Math.round(meters))} m` }
}

/** Color y sombra del texto bajo el anillo — legible en exteriores. */
export function getRingProgressFeedbackStyle(progress) {
  const fill = Math.min(1, Math.max(0, progress ?? 0))
  const isPeak = fill >= 0.97
  const emphasis = isPeak ? 1 : 0.72 + fill ** 0.85 * 0.28

  return {
    isPeak,
    color: `rgba(255,255,255,${emphasis})`,
    textShadow: '0 1px 10px rgba(0,0,0,0.72), 0 0 18px rgba(0,0,0,0.35)',
    opacity: 0.82 + fill * 0.18,
  }
}

/** Glow, marco y partículas según cuánto verde hay en el arco (no el color del trazo). */
export function getRingProximityColors(progress, { isReady = false } = {}) {
  if (isReady) {
    return {
      glow: 'rgba(140,198,63,0.38)',
      glowIntensity: 0.85,
      particle: RING_PROGRESS_COLOR,
      frameGlow: '0 0 22px rgba(140,198,63,0.38)',
      frameBorder: 'rgba(140,198,63,0.78)',
    }
  }

  const fill = Math.min(1, Math.max(0, progress))
  const glowIntensity = fill ** 1.2

  return {
    glow: `rgba(140,198,63,${0.03 + glowIntensity * 0.28})`,
    glowIntensity,
    particle:
      fill >= 0.35
        ? RING_PROGRESS_COLOR
        : `rgba(255,255,255,${0.28 + fill * 0.38})`,
    frameGlow: `0 0 ${4 + fill * 18}px rgba(140,198,63,${0.05 + fill * 0.26})`,
    frameBorder:
      fill >= 0.8
        ? `rgba(140,198,63,${0.42 + fill * 0.28})`
        : `rgba(255,255,255,${0.18 + fill * 0.26})`,
  }
}
