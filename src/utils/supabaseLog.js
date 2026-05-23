const TAGS = {
  auth: '[supabase-auth]',
  upload: '[supabase-upload]',
  figures: '[supabase-figures]',
  sync: '[supabase-sync]',
}

function emit(tag, level, message, detail) {
  const prefix = TAGS[tag] ?? '[supabase]'
  if (detail !== undefined) {
    if (level === 'warn') console.warn(prefix, message, detail)
    else console.info(prefix, message, detail)
  } else if (level === 'warn') {
    console.warn(prefix, message)
  } else {
    console.info(prefix, message)
  }
}

export const supabaseLog = {
  auth: {
    info: (message, detail) => emit('auth', 'info', message, detail),
    warn: (message, detail) => emit('auth', 'warn', message, detail),
  },
  upload: {
    info: (message, detail) => emit('upload', 'info', message, detail),
    warn: (message, detail) => emit('upload', 'warn', message, detail),
  },
  figures: {
    info: (message, detail) => emit('figures', 'info', message, detail),
    warn: (message, detail) => emit('figures', 'warn', message, detail),
  },
  sync: {
    info: (message, detail) => emit('sync', 'info', message, detail),
    warn: (message, detail) => emit('sync', 'warn', message, detail),
  },
}
