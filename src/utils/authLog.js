function emit(tag, level, message, detail) {
  const prefix = tag === 'profile' ? '[profile]' : '[auth]'
  if (detail !== undefined) {
    if (level === 'error') console.error(prefix, message, detail)
    else console.info(prefix, message, detail)
  } else if (level === 'error') {
    console.error(prefix, message)
  } else {
    console.info(prefix, message)
  }
}

export const authLog = {
  info: (message, detail) => emit('auth', 'info', message, detail),
  error: (message, detail) => emit('auth', 'error', message, detail),
}

export const profileLog = {
  info: (message, detail) => emit('profile', 'info', message, detail),
  error: (message, detail) => emit('profile', 'error', message, detail),
}
