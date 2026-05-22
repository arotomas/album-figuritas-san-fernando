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
  nativeFileSelected: (data) => emit('info', 'native camera file selected', data),
  warn: (label, data) => emit('warn', label, data),
}
