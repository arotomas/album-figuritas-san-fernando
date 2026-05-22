/** Umbrales UX para proximidad, GPS, vibración y recovery */

/** Distancia para detectar figurita cercana y habilitar captura (GPS flexible) */
export const PROXIMITY_ENTER_METERS = 250
export const PROXIMITY_EXIT_METERS = 280

/** Máxima distancia al punto al momento de sacar la foto */
export const CAPTURE_MAX_DISTANCE_METERS = 250

export const VIBRATION_NEAR_COOLDOWN_MS = 12_000
export const VIBRATION_READY_COOLDOWN_MS = 6_000

export const GPS_STABILITY_UNSTABLE_READINGS = 3
export const GPS_RECOVERY_DELAY_MS = 400

export const PERMISSION_RETRY_DELAY_MS = 500
