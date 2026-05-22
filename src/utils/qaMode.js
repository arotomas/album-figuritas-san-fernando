import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { isDevMode } from './devMode'

const QA_SESSION_KEY = 'figuritas-qa-mode'

export function hasQaQueryParam(search = '') {
  if (!search) return false
  try {
    return new URLSearchParams(search).get('qa') === '1'
  } catch {
    return false
  }
}

/**
 * Activa QA temporal si la URL incluye ?qa=1 (persiste solo en esta pestaña).
 */
export function syncQaModeFromUrl(search) {
  if (typeof window === 'undefined') return false

  try {
    const query = search ?? window.location.search
    if (hasQaQueryParam(query)) {
      sessionStorage.setItem(QA_SESSION_KEY, '1')
      return true
    }
  } catch {
    // sessionStorage no disponible
  }

  return false
}

export function isQaModeEnabled(search) {
  if (typeof window === 'undefined') return false

  const query = search ?? window.location.search
  if (hasQaQueryParam(query)) {
    syncQaModeFromUrl(query)
    return true
  }

  try {
    return sessionStorage.getItem(QA_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function withQaParam(path, active = isQaModeEnabled()) {
  if (!active || typeof path !== 'string') return path

  const [pathname, rawSearch = ''] = path.split('?')
  const params = new URLSearchParams(rawSearch)
  params.set('qa', '1')
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

/** Dev local o QA temporal en producción (?qa=1 en esta sesión). */
export function canUseTestFigure(search) {
  return isDevMode() || isQaModeEnabled(search)
}

export function useQaMode() {
  const location = useLocation()
  const [active, setActive] = useState(() =>
    isQaModeEnabled(`${location.pathname}${location.search}`),
  )

  useEffect(() => {
    const enabled = isQaModeEnabled(`${location.pathname}${location.search}`)
    setActive(enabled)
  }, [location.pathname, location.search])

  return {
    isQaActive: active,
    isDevMode: isDevMode(),
    showQaTools: active || isDevMode(),
    canUseTestFigure: active || isDevMode(),
    withQa: (path) => withQaParam(path, active),
  }
}
