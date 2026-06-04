export const PLAYER_PROGRESS_RESET_EVENT = 'album:player-progress-reset'

/** Notifica a badge de puntos y ranking que el progreso remoto fue reiniciado. */
export function notifyPlayerProgressReset(detail = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(PLAYER_PROGRESS_RESET_EVENT, { detail }),
  )
}
