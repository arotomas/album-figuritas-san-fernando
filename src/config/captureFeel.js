/** Timings de polish captura/recompensa — solo UX, sin lógica de gameplay. */

/** Pausa ceremonial post-guardado antes del reveal (ms). */
export const REWARD_ENTRY_BEAT_MS = 320

/** Mínimo de flash blanco antes del reveal — continuidad emocional. */
export const FLASH_MIN_HOLD_MS = 480

/** Snap visual al entrar en ready (ms). */
export const READY_SNAP_MS = 120

/** Duración total unlock screen (ms). */
export const UNLOCK_SEQUENCE_MS = 3000

/** Card reveal — stagger cinematográfico (ms desde inicio). */
export const REWARD_TIMINGS = {
  full: {
    enter: 320,
    flip: 860,
    reveal: 1480,
    shine: 2040,
    info: 2620,
    done: 4100,
  },
  reduced: {
    enter: 180,
    flip: 380,
    reveal: 580,
    shine: 780,
    info: 1180,
    done: 1900,
  },
}
