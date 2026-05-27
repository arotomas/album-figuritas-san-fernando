/**
 * Traza rotación cinematográfica — solo DEV ([ROTATION]).
 */

export function rotationTrace(message, detail) {
  if (!import.meta.env.DEV) return
  if (detail !== undefined) {
    console.info('[ROTATION]', message, detail)
  } else {
    console.info('[ROTATION]', message)
  }
}
