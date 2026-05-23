/** Google Maps / Places — autocomplete de domicilio (Zona Norte GBA). */

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''

export const ZONA_NORTE_CENTER = { lat: -34.4417, lng: -58.5625 }

/** Rectángulo aproximado Zona Norte + GBA norte. */
export const ZONA_NORTE_BOUNDS = {
  north: -34.38,
  south: -34.62,
  east: -58.42,
  west: -58.78,
}

export const PRIORITY_LOCALITIES = [
  'san fernando',
  'tigre',
  'san isidro',
  'vicente lópez',
  'vicente lopez',
  'general pacheco',
  'olivos',
  'martínez',
  'martinez',
  'beccar',
  'boulogne',
  'victoria',
  'don torcuato',
]

export function isGooglePlacesConfigured() {
  return Boolean(GOOGLE_MAPS_API_KEY?.trim())
}
