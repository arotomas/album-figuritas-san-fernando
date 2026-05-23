const TAG = '[mobile-photo]'

function emit(level, message, detail) {
  if (detail !== undefined) {
    if (level === 'error' || level === 'warn') console.warn(TAG, message, detail)
    else console.info(TAG, message, detail)
  } else if (level === 'error' || level === 'warn') {
    console.warn(TAG, message)
  } else {
    console.info(TAG, message)
  }
}

export const mobilePhotoLog = {
  info: (message, detail) => emit('info', message, detail),
  warn: (message, detail) => emit('warn', message, detail),
  error: (message, detail) => emit('error', message, detail),
}
