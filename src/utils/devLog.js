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
  pendingFigureSet: (detail) => logCapture('info', 'pending figure set', detail),
  pendingFigureExistsAfterNativePhoto: (detail) =>
    logCapture('info', 'pending figure exists after native photo', detail),
  usingLocationSnapshot: (detail) => logCapture('info', 'using location snapshot', detail),
  skippingGpsConfirmationAfterPhoto: (detail) =>
    logCapture('info', 'skipping GPS confirmation after photo', detail),
  nativeInputOpened: (detail) => logCapture('info', 'native input opened', detail),
  photoReceived: (detail) => logCapture('info', 'photo received', detail),
  skipDistanceRecheck: (detail) =>
    logCapture('info', 'skip distance recheck after native photo', detail),
  fileSelected: (detail) => logCapture('info', 'file selected', detail),
  fileReceived: (detail) => logCapture('info', 'file received', detail),
  loadImageStart: (detail) => logCapture('info', 'load image start', detail),
  loadImageSuccess: (detail) => logCapture('info', 'load image success', detail),
  compressStart: (detail) => logCapture('info', 'compress start', detail),
  compressSuccess: (detail) => logCapture('info', 'compress success', detail),
  unlockStart: (detail) => logCapture('info', 'unlock start', detail),
  finished: (detail) => logCapture('info', 'finished', detail),
  timeout: (detail) => logCapture('warn', 'timeout', detail),
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
