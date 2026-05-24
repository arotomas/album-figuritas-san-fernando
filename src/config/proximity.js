/** Radios de detección vs captura por rareza (metros). */

export const PROXIMITY_RARITY_CONFIG = {
  'común': { detectionMeters: 200, captureMeters: 25, exitBufferMeters: 25 },
  rara: { detectionMeters: 100, captureMeters: 18, exitBufferMeters: 15 },
  'épica': { detectionMeters: 100, captureMeters: 12, exitBufferMeters: 15 },
  legendaria: { detectionMeters: 80, captureMeters: 9, exitBufferMeters: 12 },
}

/** Cooldown entre avisos de la misma figurita (2 min). */
export const FIGURE_ALERT_COOLDOWN_MS = 120_000

/** Throttle visual: el GPS puede fluctuar; el aro se suaviza aparte. */
export const PROXIMITY_VISUAL_LERP = 0.11
export const PROXIMITY_VISUAL_SETTLE_EPSILON = 0.004

export const PROXIMITY_PHASES = {
  NONE: 'none',
  FAR: 'far',
  MEDIUM: 'medium',
  CLOSE: 'close',
  CAPTURE: 'capture',
}
