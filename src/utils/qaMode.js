import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { isDevMode } from './devMode'

const QA_SESSION_KEY = 'album-qa-mode'
const QA_SESSION_KEY_LEGACY = 'figuritas-qa-mode'

function readSessionQaFlag() {
  try {
    if (sessionStorage.getItem(QA_SESSION_KEY) === '1') return true
    if (sessionStorage.getItem(QA_SESSION_KEY_LEGACY) === '1') {
      sessionStorage.setItem(QA_SESSION_KEY, '1')
      return true
    }
  } catch {
    // ignore
  }
  return false
}

export function activateQaMode({ log = true } = {}) {
  try {
    sessionStorage.setItem(QA_SESSION_KEY, '1')
    if (log) {
      console.info('[QA] enabled', true)
    }
    return true
  } catch {
    return false
  }
}

export function isQaMode() {
  if (typeof window === 'undefined') return false

  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('qa') === '1') {
      return activateQaMode()
    }

    return readSessionQaFlag()
  } catch {
    return false
  }
}

/** Sincroniza ?qa=1 → sessionStorage en cada navegación. */
export function syncQaModeFromUrl() {
  const active = isQaMode()
  return active
}

/** @deprecated usar isQaMode */
export function isQaModeEnabled() {
  return isQaMode()
}

export function withQaParam(path, active = isQaMode()) {
  if (!active || typeof path !== 'string') return path

  const [pathname, rawSearch = ''] = path.split('?')
  const params = new URLSearchParams(rawSearch)
  params.set('qa', '1')
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function canUseTestFigure() {
  return isDevMode() || isQaMode()
}

export function useQaMode() {
  const location = useLocation()
  const [active, setActive] = useState(() => isQaMode())

  useEffect(() => {
    setActive(syncQaModeFromUrl())
  }, [location.search, location.pathname])

  return {
    isQaActive: active,
    isDevMode: isDevMode(),
    showQaTools: active || isDevMode(),
    canUseTestFigure: active || isDevMode(),
    withQa: (path) => withQaParam(path, active),
  }
}
