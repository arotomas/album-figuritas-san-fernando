/** Timings de polish captura/recompensa — solo UX, sin lógica de gameplay. */

/** Pausa ceremonial post-guardado antes del reveal (ms). */
export const REWARD_ENTRY_BEAT_MS = 320

/** Mínimo de flash blanco antes del reveal — continuidad emocional. */
export const FLASH_MIN_HOLD_MS = 480

/** Snap visual al entrar en ready (ms). */
export const READY_SNAP_MS = 120

/** Duración total unlock screen (ms). */
export const UNLOCK_SEQUENCE_MS = 3000

/** Recompensa fullscreen post-captura (ms). */
export const FULLSCREEN_REWARD_MS = {
  full: { hold: 3200 },
  reduced: { hold: 1800 },
}

/** Delay del bloque "¡Ganaste! +X pts" tras `visible` (sincroniza animación y SFX). */
export const POINTS_BURST_REVEAL_DELAY_MS = {
  full: 220,
  reduced: 80,
}

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

/** Beat previo al reveal para rarezas especiales (ms) — peso visual, no duración. */
export const RARITY_DISCOVERY_BEAT_MS = {
  full: {
    rara: 1020,
    épica: 1140,
    legendaria: 1180,
  },
  reduced: {
    rara: 540,
    épica: 600,
    legendaria: 620,
  },
}
