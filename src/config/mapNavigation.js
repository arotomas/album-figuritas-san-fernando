/** UX mapa — foco local capturable y ruta orientativa (sin tocar captura). */

/** Por encima de esto se mantiene la misión manual aunque haya otras cerca. */
export const MAP_MANUAL_TARGET_FAR_M = 80

/** Distancia directa usuario → destino: ocultar polyline OSRM. */
export const MAP_ROUTE_HIDE_DIRECT_M = 90

/** Ventaja mínima de la figurita más cercana para cambiar foco local (anti-flapping). */
export const MAP_CAPTURE_SWITCH_DELTA_M = 15

/** Empate de distancia: rareza solo si están a menos de esto (m). */
export const MAP_RARITY_TIEBREAK_MAX_M = 5

/** Varias figuritas en detección → modo zona densa. */
export const MAP_LOCAL_ZONE_MIN_NEAR_COUNT = 2
