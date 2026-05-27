export function bootLog(message, detail) {
  if (!import.meta.env.DEV) return
  if (detail !== undefined) {
    console.info('[BOOT]', message, detail)
  } else {
    console.info('[BOOT]', message)
  }
}

export function bootWarn(message, detail) {
  if (!import.meta.env.DEV) return
  if (detail !== undefined) {
    console.warn('[BOOT]', message, detail)
  } else {
    console.warn('[BOOT]', message)
  }
}
