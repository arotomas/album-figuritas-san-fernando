/**
 * Experimento: routing por calles vía OSRM público.
 * Rama: test/street-routing-osrm
 */
export const STREET_ROUTING_OSRM_EXPERIMENT = {
  enabled: true,
  baseUrl: 'https://router.project-osrm.org',
  profile: 'walking',
  /** Si OSRM falla, usar SimpleTargetLineLayer (línea recta). */
  fallbackToStraightLine: true,
}
