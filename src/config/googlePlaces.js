/** Google Maps / Places — autocomplete de domicilio (Zona Norte GBA). */

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''

/** Centro geográfico aproximado Zona Norte. */
export const ZONA_NORTE_CENTER = { lat: -34.45, lng: -58.65 }

/** Radio de bias en metros (~40 km). */
export const ZONA_NORTE_RADIUS_METERS = 40000

/** Rectángulo aproximado Zona Norte GBA. */
export const ZONA_NORTE_BOUNDS = {
  north: -34.3,
  south: -34.58,
  east: -58.45,
  west: -58.85,
}

/** Municipios/partidos permitidos para domicilio. */
export const ALLOWED_MUNICIPALITIES = [
  'san fernando',
  'tigre',
  'san isidro',
  'vicente lopez',
  'vicente lópez',
  'escobar',
  'pilar',
  'malvinas argentinas',
  'jose c. paz',
  'jose c paz',
  'josé c. paz',
  'josé c paz',
  'san miguel',
]

/** Barrios frecuentes dentro de municipios permitidos (refuerzo de match). */
export const ALLOWED_LOCALITY_ALIASES = [
  'virreyes',
  'victoria',
  'general pacheco',
  'don torcuato',
  'benavidez',
  'el talar',
  'rincon de milberg',
  'olivos',
  'martinez',
  'martínez',
  'beccar',
  'boulogne',
  'acassuso',
  'munro',
  'florida',
  'la lucila',
  'villa ballester',
  'los polvorines',
  'tortuguitas',
  'del viso',
  'derqui',
  'garin',
  'maschwitz',
  'ingeniero maschwitz',
  'bella vista',
  'muñiz',
  'muniz',
]

/** Scores base por tier de municipio (mayor = más arriba en la lista). */
export const RANK_TIER_SCORES = {
  max: 300,
  high: 200,
  normal: 100,
}

/** Boost extra cuando el usuario escribe "san fernando" y el resultado es de San Fernando. */
export const SAN_FERNANDO_INPUT_BOOST = 150

/**
 * Patrones por tier de prioridad visual.
 * max: San Fernando | high: Tigre, San Isidro, Vicente López | normal: resto permitido
 */
export const MUNICIPALITY_TIER_PATTERNS = {
  max: ['san fernando', 'virreyes', 'victoria', 'bella vista'],
  high: [
    'tigre',
    'general pacheco',
    'don torcuato',
    'benavidez',
    'el talar',
    'rincon de milberg',
    'san isidro',
    'martinez',
    'martínez',
    'beccar',
    'boulogne',
    'acassuso',
    'vicente lopez',
    'vicente lópez',
    'olivos',
    'munro',
    'florida',
    'la lucila',
  ],
  normal: [
    'escobar',
    'pilar',
    'malvinas argentinas',
    'jose c. paz',
    'jose c paz',
    'josé c. paz',
    'josé c paz',
    'san miguel',
    'villa ballester',
    'los polvorines',
    'tortuguitas',
    'del viso',
    'derqui',
    'garin',
    'maschwitz',
    'ingeniero maschwitz',
    'muñiz',
    'muniz',
  ],
}

/** Tipos de Places que representan negocios/POI — se descartan. */
export const POI_PREDICTION_TYPES = new Set([
  'establishment',
  'point_of_interest',
  'store',
  'food',
  'restaurant',
  'cafe',
  'bakery',
  'bar',
  'meal_takeaway',
  'shopping_mall',
  'park',
  'place_of_worship',
  'school',
  'hospital',
  'doctor',
  'pharmacy',
  'supermarket',
  'convenience_store',
  'gas_station',
  'bank',
  'atm',
  'tourist_attraction',
  'museum',
  'stadium',
])

export function isGooglePlacesConfigured() {
  return Boolean(GOOGLE_MAPS_API_KEY?.trim())
}

export function normalizePlaceText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function getMunicipalityTier(text) {
  const normalized = normalizePlaceText(text)
  if (!normalized) return null

  for (const tier of ['max', 'high', 'normal']) {
    const matches = MUNICIPALITY_TIER_PATTERNS[tier].some((pattern) =>
      normalized.includes(normalizePlaceText(pattern)),
    )
    if (matches) return tier
  }

  return null
}

export function getPredictionSearchText(prediction) {
  return [
    prediction?.description,
    prediction?.structured_formatting?.main_text,
    prediction?.structured_formatting?.secondary_text,
  ]
    .filter(Boolean)
    .join(' ')
}

export function scorePredictionRelevance(prediction, input = '') {
  const text = getPredictionSearchText(prediction)
  const tier = getMunicipalityTier(text) ?? 'normal'
  let score = RANK_TIER_SCORES[tier]

  const normalizedInput = normalizePlaceText(input)
  if (normalizedInput.includes('san fernando') && tier === 'max') {
    score += SAN_FERNANDO_INPUT_BOOST
  }

  const secondary = normalizePlaceText(prediction?.structured_formatting?.secondary_text)
  if (secondary && getMunicipalityTier(secondary)) {
    score += 10
  }

  return { score, tier }
}

export function matchesAllowedMunicipality(text) {
  const normalized = normalizePlaceText(text)
  if (!normalized) return false

  const patterns = [...ALLOWED_MUNICIPALITIES, ...ALLOWED_LOCALITY_ALIASES]
  return patterns.some((pattern) => normalized.includes(normalizePlaceText(pattern)))
}

export function isAllowedZonaNorteAddress(address) {
  if (!address) return false

  const parts = [
    address.direccion_texto,
    address.localidad,
    address.provincia,
  ]

  return parts.some((part) => matchesAllowedMunicipality(part))
}
