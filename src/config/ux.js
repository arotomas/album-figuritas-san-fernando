/** Umbrales UX para proximidad, GPS, vibración y recovery */

/** @deprecated Usar config/proximity.js — mantener alias legacy */
export const PROXIMITY_ENTER_METERS = 200
export const PROXIMITY_EXIT_METERS = 225

/** @deprecated Usar radios por rareza en config/proximity.js */
export const CAPTURE_MAX_DISTANCE_METERS = 25

export const VIBRATION_NEAR_COOLDOWN_MS = 120_000
export const VIBRATION_READY_COOLDOWN_MS = 6_000
export const VIBRATION_PROXIMITY_PULSE_COOLDOWN_MS = 8_000

export const GPS_STABILITY_UNSTABLE_READINGS = 3
export const GPS_RECOVERY_DELAY_MS = 400

export const PERMISSION_RETRY_DELAY_MS = 500
