/** Modo exploración — desacoplado de captura / misión / unlock. */

export const EXPLORATION_FLY_DURATION_S = 2.1

/** [topBottom, leftRight] — padding mobile-safe para fitBounds */
export const EXPLORATION_BOUNDS_PADDING = [108, 40]

export const EXPLORATION_MAX_ZOOM = 16

export const EXPLORATION_MAX_ZOOM_NEAR = 17.25

export const EXPLORATION_DISTANCE_NEAR_M = 120

export const EXPLORATION_DISTANCE_UPDATE_MIN_M = 4

export const EXPLORATION_DISTANCE_UPDATE_MIN_MS = 650

/** Mínimo movimiento antes de redibujar la polyline (evita parpadeo del markerPane). */
export const EXPLORATION_LINE_UPDATE_MIN_M = 3
