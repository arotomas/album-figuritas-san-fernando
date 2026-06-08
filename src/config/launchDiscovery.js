/** Descubrimiento pasivo por proximidad — evento de lanzamiento (solo foreground). */

export const LAUNCH_DISCOVERY_ENABLED = true

export const LAUNCH_DISCOVERY_RADIUS_M = 50

export const LAUNCH_DISCOVERY_EXIT_M = 65

/** Evita tormentas cuando varias figuritas entran al radio a la vez. */
export const GLOBAL_DISCOVERY_COOLDOWN_MS = 10_000

/** Debounce GPS — alineado con proximidad del mapa. */
export const LAUNCH_DISCOVERY_GPS_DEBOUNCE_MS = 320
