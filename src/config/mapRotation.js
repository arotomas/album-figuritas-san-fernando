/** Rotación cinematográfica del mapa (dirección de movimiento real). */

/** Intervalo máximo de actualización visual del bearing (ms). */
export const MAP_ROTATION_UPDATE_MS = 420

/** Velocidad mínima para considerar que el usuario camina (m/s). */
export const MAP_ROTATION_MIN_SPEED_MPS = 0.95

/** Por debajo de esto: congelar bearing (no corregir). */
export const MAP_ROTATION_STOP_SPEED_MPS = 0.55

/** Tiempo quieto antes de dejar de actualizar el target (ms). */
export const MAP_ROTATION_STOP_HOLD_MS = 1_600

/** Distancia mínima entre fixes para calcular rumbo por movimiento (m). */
export const MAP_ROTATION_MIN_COG_DISTANCE_M = 4.5

/** Accuracy máxima para rotar (m). */
export const MAP_ROTATION_MAX_ACCURACY_M = 38

/** Suavizado EMA hacia el target (0–1; menor = más inercia). */
export const MAP_ROTATION_EMA_ALPHA = 0.065

/** Delta angular mínimo para publicar un nuevo bearing (°). */
export const MAP_ROTATION_MIN_DELTA_DEG = 5.5

/** Volver suavemente a norte cuando no hay rumbo válido. */
export const MAP_ROTATION_RETURN_NORTH_ALPHA = 0.045

/** Transición CSS del pane (debe alinearse con intervalo + EMA). */
export const MAP_ROTATION_CSS_MS = 720
