const CAPTURE_TRACE = true

function logCapture(level, message, detail) {
  if (!CAPTURE_TRACE && !import.meta.env.DEV) return
  const prefix = '[CAPTURE]'
  if (detail !== undefined) {
    if (level === 'warn') console.warn(prefix, message, detail)
    else console.info(prefix, message, detail)
  } else if (level === 'warn') {
    console.warn(prefix, message)
  } else {
    console.info(prefix, message)
  }
}

function log(tag, level, ...args) {
  if (!import.meta.env.DEV) return
  const prefix = `[${tag}]`
  if (level === 'warn') console.warn(prefix, ...args)
  else console.info(prefix, ...args)
}

export const captureLog = {
  info: (...args) => log('CAPTURE', 'info', ...args),
  warn: (...args) => log('CAPTURE', 'warn', ...args),
  fileSelected: (detail) => logCapture('info', 'file selected', detail),
  processingStart: (detail) => logCapture('info', 'processing start', detail),
  compressionSuccess: (detail) => logCapture('info', 'compression success', detail),
  unlockSuccess: (detail) => logCapture('info', 'unlock success', detail),
  processingError: (detail) => logCapture('warn', 'processing error', detail),
}

export const rewardLog = {
  info: (...args) => log('REWARD', 'info', ...args),
  warn: (...args) => log('REWARD', 'warn', ...args),
}

export const albumLog = {
  info: (...args) => log('ALBUM', 'info', ...args),
  warn: (...args) => log('ALBUM', 'warn', ...args),
}
