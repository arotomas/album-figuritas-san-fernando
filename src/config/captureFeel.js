/** Timings de polish captura/recompensa — solo UX, sin lógica de gameplay. */

/** Pausa ceremonial post-guardado antes del reveal (ms). */
export const REWARD_ENTRY_BEAT_MS = 140

/** Snap visual al entrar en ready (ms). */
export const READY_SNAP_MS = 120

/** Duración total unlock screen (ms). */
export const UNLOCK_SEQUENCE_MS = 2800

/** Card reveal — stagger cinematográfico (ms desde inicio). */
export const REWARD_TIMINGS = {
  full: {
    enter: 280,
    flip: 780,
    reveal: 1380,
    shine: 1920,
    info: 2480,
    done: 3800,
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
