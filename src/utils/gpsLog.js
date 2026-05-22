export const gpsLog = {
  fix: (...args) => {
    if (import.meta.env.DEV) console.info('[GPS]', ...args)
  },
  update: (...args) => {
    if (import.meta.env.DEV) console.info('[GPS]', ...args)
  },
  state: (...args) => {
    if (import.meta.env.DEV) console.info('[GPS]', ...args)
  },
  discard: (...args) => {
    if (import.meta.env.DEV) console.info('[GPS]', ...args)
  },
  warn: (...args) => {
    if (import.meta.env.DEV) console.warn('[GPS]', ...args)
  },
  error: (...args) => {
    if (import.meta.env.DEV) console.warn('[GPS]', ...args)
  },
}
