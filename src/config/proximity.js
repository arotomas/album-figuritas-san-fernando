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
export const PROXIMITY_VISUAL_LERP_APPROACH = 0.14
export const PROXIMITY_VISUAL_LERP_RECEDE = 0.055
/** @deprecated usar LERP_APPROACH / LERP_RECEDE */
export const PROXIMITY_VISUAL_LERP = PROXIMITY_VISUAL_LERP_APPROACH
export const PROXIMITY_VISUAL_SETTLE_EPSILON = 0.003
/** Actualizar React como mucho cada N frames (~24fps). */
export const PROXIMITY_VISUAL_UPDATE_EVERY_N_FRAMES = 3
/** Debounce GPS en mapa (overlay proximidad). */
export const MAP_PROXIMITY_DEBOUNCE_MS = 320

/** Target lock — overlay estable frente a jitter GPS. */
export const TARGET_LOCK_FOCUS_NEAR_ENTER_MS = 100
export const TARGET_LOCK_FOCUS_NEAR_HOLD_MS = 520
export const TARGET_LOCK_SECONDARY_HINT_HOLD_MS = 420

/** Mission follow — pausa tras interacción manual del mapa. */
export const MISSION_FOLLOW_RESUME_MS = 4500
/** Pan de misión: no recentrar más seguido que esto. */
export const MAP_FOLLOW_MIN_INTERVAL_MS = 850
export const MAP_FOLLOW_MIN_MOVE_METERS = 3.5
/** Umbral de movimiento para pan en misión (~3m). */
export const MAP_FOLLOW_MOVE_THRESHOLD = 0.000028

/** Sync store/UI de proximidad — evita rerenders por micro-cambios de distancia. */
export const MAP_NEAR_SYNC_DISTANCE_BUCKET_M = 8

/** Captura — histéresis de rango para ready/aro estables. */
export const CAPTURE_RANGE_EXIT_SCALE = 1.15
export const READY_RING_ENTER_THRESHOLD = 0.88
export const READY_RING_EXIT_THRESHOLD = 0.82

export const PROXIMITY_PHASES = {
  NONE: 'none',
  FAR: 'far',
  MEDIUM: 'medium',
  CLOSE: 'close',
  CAPTURE: 'capture',
}
