function emit(level, message, detail) {
  const payload = detail == null ? '' : detail
  console[level === 'error' ? 'error' : 'info'](`[auth-restore] ${message}`, payload)
}

export const authRestoreLog = {
  info: (message, detail) => emit('info', message, detail),
  error: (message, detail) => emit('error', message, detail),
}
