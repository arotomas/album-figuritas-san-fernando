import {
  PROXIMITY_THRESHOLD_METERS,
  SAN_FERNANDO_CENTER,
} from '../data/mockFigures'

export const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || ''

export const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11'

export const DEFAULT_CENTER = SAN_FERNANDO_CENTER

export const DEFAULT_ZOOM = 15

export const USER_ZOOM = 16.5

export const PROXIMITY_METERS = PROXIMITY_THRESHOLD_METERS

export const isMapboxConfigured = () => Boolean(MAPBOX_ACCESS_TOKEN)
