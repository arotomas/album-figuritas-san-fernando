import {
  PROXIMITY_THRESHOLD_METERS,
  SAN_FERNANDO_CENTER,
} from '../data/mockFigures'

/** San Fernando — formato Leaflet [lat, lng] */
export const DEFAULT_CENTER = [
  SAN_FERNANDO_CENTER[1],
  SAN_FERNANDO_CENTER[0],
]

export const DEFAULT_ZOOM = 15

export const USER_ZOOM = 16.5

export const PROXIMITY_METERS = PROXIMITY_THRESHOLD_METERS

/** OpenStreetMap — gratuito, sin token */
export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

export const TILE_OPTIONS = {
  maxZoom: 19,
  subdomains: ['a', 'b', 'c'],
}

/**
 * Filtro CSS solo sobre los tiles (no marcadores).
 * Antes: saturate(0.55) brightness(0.78) — look cinematográfico apagado.
 */
export const MAP_TILE_FILTER = 'saturate(1.08) brightness(1.02) contrast(1.04)'

/** Mínimo cambio de layout antes de invalidateSize (evita jitter en móvil). */
export const MAP_RESIZE_MIN_DELTA_PX = 6

/** Espera tras gesto táctil antes de volver a medir el mapa. */
export const MAP_GESTURE_END_HOLD_MS = 360
