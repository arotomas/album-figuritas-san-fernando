function emit(level, label, data) {
  const method = level === 'warn' ? console.warn : console.info
  if (data !== undefined) {
    method(`[CAMERA] ${label}`, data)
  } else {
    method(`[CAMERA] ${label}`)
  }
}

export const cameraLog = {
  granted: (data) => emit('info', 'permission granted', data),
  prompt: (data) => emit('info', 'permission prompt', data),
  denied: (data) => emit('info', 'permission denied', data),
  getUserMediaStart: (data) => emit('info', 'getUserMedia start', data),
  streamReady: (data) => emit('info', 'stream ready', data),
  metadataLoaded: (data) => emit('info', 'video metadata loaded', data),
  dimensions: (data) => emit('info', 'video dimensions', data),
  blackPreviewFallback: (data) => emit('warn', 'black preview fallback', data),
  nativeInputOpen: () => emit('info', 'native input open'),
  /** @deprecated usar nativeInputOpen */
  mobileNativeInputOpen: () => emit('info', 'native input open'),
  nativeFileSelected: (data) => emit('info', 'native camera file selected', data),
  nativeFileAccepted: (data) => emit('info', 'native file accepted', data),
  warn: (label, data) => emit('warn', label, data),
}
