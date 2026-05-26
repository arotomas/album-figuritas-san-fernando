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
export const PROXIMITY_VISUAL_LERP_APPROACH = 0.2
export const PROXIMITY_VISUAL_LERP_RECEDE = 0.09
/** @deprecated usar LERP_APPROACH / LERP_RECEDE */
export const PROXIMITY_VISUAL_LERP = PROXIMITY_VISUAL_LERP_APPROACH
export const PROXIMITY_VISUAL_SETTLE_EPSILON = 0.004
/** Actualizar React como mucho cada N frames (~30fps). */
export const PROXIMITY_VISUAL_UPDATE_EVERY_N_FRAMES = 2
/** Debounce GPS en mapa (overlay proximidad). */
export const MAP_PROXIMITY_DEBOUNCE_MS = 320

export const PROXIMITY_PHASES = {
  NONE: 'none',
  FAR: 'far',
  MEDIUM: 'medium',
  CLOSE: 'close',
  CAPTURE: 'capture',
}
