/**
 * Bearing cinematográfico para overlays (punto azul y figuritas).
 * Mapa norte-arriba; calibración perceptual — ajustar aquí sin tocar arquitectura.
 */

/** Intervalo de publicación visual del bearing (ms). */
export const MAP_ROTATION_UPDATE_MS = 340

/** Velocidad mínima para activar acompañamiento (m/s) — caminata real. */
export const MAP_ROTATION_MIN_SPEED_MPS = 0.88

/** Por debajo de esto: candidato a modo quieto (m/s). */
export const MAP_ROTATION_STOP_SPEED_MPS = 0.58

/**
 * Tiempo con velocidad baja antes de bloquear quiet (ms).
 * Congela bearing, COG, EMA y return-to-north.
 */
export const MAP_ROTATION_QUIET_LOCK_MS = 2_500

/** Velocidad mínima sostenida para despertar (evita spikes GPS 0.4–1.0 m/s). */
export const MAP_ROTATION_WAKE_SPEED_MPS = 1.02

/** Duración de velocidad de despertar requerida (ms). */
export const MAP_ROTATION_WAKE_SPEED_CONFIRM_MS = 1_400

/** Desplazamiento real desde el punto de lock para despertar (m). */
export const MAP_ROTATION_WAKE_DISTANCE_M = 4.5

/**
 * Paso menor a esto con speed inflado → drift; no actualizar COG ni despertar.
 */
export const MAP_ROTATION_DRIFT_MAX_STEP_M = 2.8

/** Distancia mínima entre fixes para COG (m). */
export const MAP_ROTATION_MIN_COG_DISTANCE_M = 3

/** Accuracy máxima para rotar (m). */
export const MAP_ROTATION_MAX_ACCURACY_M = 40

/** Suavizado EMA hacia el target (0–1). ↑ = más perceptible, ↓ = más inercia. */
export const MAP_ROTATION_EMA_ALPHA = 0.12

/** Delta angular mínimo para publicar (°). */
export const MAP_ROTATION_MIN_DELTA_DEG = 3.5

/** Transición CSS de overlays — alineada con UPDATE_MS + EMA. */
export const MAP_ROTATION_CSS_MS = 640
