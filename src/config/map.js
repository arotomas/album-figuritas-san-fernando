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
