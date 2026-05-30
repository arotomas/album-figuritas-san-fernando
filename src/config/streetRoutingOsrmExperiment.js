/**
 * Routing por calles vía OSRM público.
 */
export const STREET_ROUTING_OSRM_EXPERIMENT = {
  enabled: true,
  baseUrl: 'https://router.project-osrm.org',
  profile: 'walking',
  /** Si OSRM falla, usar SimpleTargetLineLayer (línea recta). */
  fallbackToStraightLine: true,
}
