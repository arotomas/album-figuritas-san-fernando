/**
 * UX de navegación — rama test/navigation-ux
 */
export const NAVIGATION_UX_EXPERIMENT = {
  enabled: true,
}

export const ARRIVAL_RADIUS_METERS = 30

export const TRANSPORT_MODES = [
  { id: 'walking', emoji: '🚶', label: 'Caminar', durationLabel: 'caminando' },
  { id: 'cycling', emoji: '🚲', label: 'Bicicleta', durationLabel: 'en bici' },
  { id: 'driving', emoji: '🚗', label: 'Auto', durationLabel: 'en auto' },
]

export const OSRM_PROFILE_BY_MODE = {
  walking: 'walking',
  cycling: 'cycling',
  driving: 'driving',
}

/** Velocidades locales para ETA cuando OSRM no diferencia duration por perfil. */
export const TRANSPORT_SPEED_KMH = {
  walking: 5,
  cycling: 15,
  driving: 30,
}
