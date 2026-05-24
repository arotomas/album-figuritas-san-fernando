export function isAbortError(error) {
  if (!error) return false
  if (error.name === 'AbortError') return true
  const message = String(error.message ?? error)
  return /abort|aborted|signal is aborted/i.test(message)
}

export function withTimeout(promise, ms = 20_000, message = 'TIMEOUT') {
  let timer = null
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

export function normalizeAdminError(error) {
  if (!error || isAbortError(error)) return null

  const message = String(error.message ?? error)
  const lower = message.toLowerCase()

  if (/jwt expired|invalid jwt|session/i.test(lower)) {
    return 'Tu sesión expiró. Volvé a iniciar sesión.'
  }
  if (/failed to fetch|networkerror|network error|offline|load failed/i.test(lower)) {
    return 'Sin conexión. Verificá tu red e intentá de nuevo.'
  }
  if (/timeout|timed out|time_out/i.test(lower)) {
    return 'La solicitud tardó demasiado. Intentá de nuevo.'
  }
  if (/forbidden|permission denied|not authorized/i.test(lower)) {
    return 'No tenés permisos para esta acción.'
  }
  if (/admin_list_players|admin_player_metrics|function.*does not exist/i.test(lower)) {
    return 'Falta aplicar la migración 014 en Supabase (RPCs de jugadores).'
  }
  if (/pgrst/i.test(lower) && /401|403/.test(lower)) {
    return 'Sesión inválida o permisos insuficientes.'
  }

  return message || 'Ocurrió un error inesperado.'
}

export class AdminRequestCancelledError extends Error {
  constructor() {
    super('REQUEST_CANCELLED')
    this.name = 'AdminRequestCancelledError'
  }
}
