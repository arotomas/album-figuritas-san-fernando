const TAGS = ['PERSIST', 'HYDRATION', 'STORAGE']

function log(tag, level, ...args) {
  if (!TAGS.includes(tag)) return
  const prefix = `[${tag}]`
  if (level === 'warn') {
    console.warn(prefix, ...args)
    return
  }
  if (import.meta.env.DEV) {
    console.info(prefix, ...args)
  }
}

export const persistLog = {
  persist: (...args) => log('PERSIST', 'info', ...args),
  persistWarn: (...args) => log('PERSIST', 'warn', ...args),
  hydration: (...args) => log('HYDRATION', 'info', ...args),
  hydrationWarn: (...args) => log('HYDRATION', 'warn', ...args),
  storage: (...args) => log('STORAGE', 'info', ...args),
  storageWarn: (...args) => log('STORAGE', 'warn', ...args),
}

export const HYDRATION_TIMEOUT_MS = 3_000
