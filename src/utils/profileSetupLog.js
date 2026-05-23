function emit(level, message, detail) {
  const payload = detail == null ? '' : detail
  console[level === 'error' ? 'error' : 'info'](`[profile-setup] ${message}`, payload)
}

export const profileSetupLog = {
  info: (message, detail) => emit('info', message, detail),
  error: (message, detail) => emit('error', message, detail),
}
