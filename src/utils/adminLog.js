const TAG = '[admin]'

function emit(level, message, detail) {
  if (detail !== undefined) {
    if (level === 'warn' || level === 'error') console.warn(TAG, message, detail)
    else console.info(TAG, message, detail)
  } else if (level === 'warn' || level === 'error') {
    console.warn(TAG, message)
  } else {
    console.info(TAG, message)
  }
}

export const adminLog = {
  info: (message, detail) => emit('info', message, detail),
  warn: (message, detail) => emit('warn', message, detail),
  error: (message, detail) => emit('error', message, detail),
}
