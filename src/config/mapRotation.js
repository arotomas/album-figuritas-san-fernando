/**
 * Rotación cinematográfica del mapa (dirección de movimiento real).
 * Calibración perceptual — ajustar aquí sin tocar arquitectura.
 */

/** Intervalo de publicación visual del bearing (ms). */
export const MAP_ROTATION_UPDATE_MS = 340

/** Velocidad mínima para activar acompañamiento (m/s). */
export const MAP_ROTATION_MIN_SPEED_MPS = 0.88

/** Por debajo de esto: entrar en modo quieto (congelar corrección). */
export const MAP_ROTATION_STOP_SPEED_MPS = 0.52

/** Tiempo quieto antes de dejar de actualizar el target (ms). */
export const MAP_ROTATION_STOP_HOLD_MS = 1_600

/** Distancia mínima entre fixes para COG (m). */
export const MAP_ROTATION_MIN_COG_DISTANCE_M = 3

/** Accuracy máxima para rotar (m). */
export const MAP_ROTATION_MAX_ACCURACY_M = 40

/** Suavizado EMA hacia el target (0–1). ↑ = más perceptible, ↓ = más inercia. */
export const MAP_ROTATION_EMA_ALPHA = 0.12

/** Delta angular mínimo para publicar (°). ↓ = más updates visibles. */
export const MAP_ROTATION_MIN_DELTA_DEG = 3.5

/** Volver a norte cuando no hay rumbo válido. */
export const MAP_ROTATION_RETURN_NORTH_ALPHA = 0.05

/** Transición CSS del pane — alineada con UPDATE_MS + EMA. */
export const MAP_ROTATION_CSS_MS = 640
