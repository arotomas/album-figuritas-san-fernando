/** Prueba extrema: bloquear auto-center del mapa tras gesto manual del usuario. */
export const USER_DRAG_AUTO_CENTER_BLOCK_MS = 60_000

let blockUntilMs = 0
let expiryTimer = null

export function registerUserDragStart(source = 'unknown') {
  const now = Date.now()
  blockUntilMs = now + USER_DRAG_AUTO_CENTER_BLOCK_MS

  if (import.meta.env.DEV) {
    console.info('[USER_DRAG_START]', {
      source,
      at: new Date(now).toISOString(),
      blockUntilMs,
      blockDurationMs: USER_DRAG_AUTO_CENTER_BLOCK_MS,
    })
    console.info('[FOLLOW_DISABLED]', {
      durationMs: USER_DRAG_AUTO_CENTER_BLOCK_MS,
      until: new Date(blockUntilMs).toISOString(),
    })
  }

  if (expiryTimer) clearTimeout(expiryTimer)
  expiryTimer = setTimeout(() => {
    expiryTimer = null
    blockUntilMs = 0
    if (import.meta.env.DEV) {
      console.info('[FOLLOW_DISABLED]', { expired: true, at: new Date().toISOString() })
    }
  }, USER_DRAG_AUTO_CENTER_BLOCK_MS)
}

export function isUserDragAutoCenterBlocked() {
  return Date.now() < blockUntilMs
}

let lastBlockedLogAt = 0
const BLOCKED_LOG_THROTTLE_MS = 1500

export function logAutoCenterBlocked(context) {
  if (!import.meta.env.DEV) return
  const now = Date.now()
  if (now - lastBlockedLogAt < BLOCKED_LOG_THROTTLE_MS) return
  lastBlockedLogAt = now
  console.info('[AUTO_CENTER_BLOCKED]', {
    ...context,
    remainingMs: Math.max(0, blockUntilMs - Date.now()),
  })
}
