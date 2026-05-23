function emit(tag, level, message, detail) {
  if (detail !== undefined) {
    if (level === 'error' || level === 'warn') console.warn(tag, message, detail)
    else console.info(tag, message, detail)
  } else if (level === 'error' || level === 'warn') {
    console.warn(tag, message)
  } else {
    console.info(tag, message)
  }
}

export const captureSyncLog = {
  info: (message, detail) => emit('[capture-sync]', 'info', message, detail),
  warn: (message, detail) => emit('[capture-sync]', 'warn', message, detail),
  error: (message, detail) => emit('[capture-sync]', 'error', message, detail),
}

export const storageTestLog = {
  info: (message, detail) => emit('[storage-test]', 'info', message, detail),
  error: (message, detail) => emit('[storage-test]', 'error', message, detail),
}
