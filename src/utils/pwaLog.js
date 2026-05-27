export function pwaLog(message, detail) {
  if (!import.meta.env.DEV) return
  if (detail !== undefined) {
    console.info('[PWA]', message, detail)
  } else {
    console.info('[PWA]', message)
  }
}

export function pwaWarn(message, detail) {
  if (!import.meta.env.DEV) return
  if (detail !== undefined) {
    console.warn('[PWA]', message, detail)
  } else {
    console.warn('[PWA]', message)
  }
}
