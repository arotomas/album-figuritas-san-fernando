function log(tag, level, ...args) {
  if (!import.meta.env.DEV) return
  const prefix = `[${tag}]`
  if (level === 'warn') console.warn(prefix, ...args)
  else console.info(prefix, ...args)
}

export const captureLog = {
  info: (...args) => log('CAPTURE', 'info', ...args),
  warn: (...args) => log('CAPTURE', 'warn', ...args),
}

export const rewardLog = {
  info: (...args) => log('REWARD', 'info', ...args),
  warn: (...args) => log('REWARD', 'warn', ...args),
}

export const albumLog = {
  info: (...args) => log('ALBUM', 'info', ...args),
  warn: (...args) => log('ALBUM', 'warn', ...args),
}
