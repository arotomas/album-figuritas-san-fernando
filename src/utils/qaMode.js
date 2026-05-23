import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { isDevMode } from './devMode'

const QA_SESSION_KEY = 'album-qa-mode'
const QA_LOCAL_KEY = 'album-qa-mode'
const QA_SESSION_KEY_LEGACY = 'figuritas-qa-mode'

function persistQaFlag() {
  try {
    sessionStorage.setItem(QA_SESSION_KEY, '1')
  } catch {
    // ignore
  }
  try {
    localStorage.setItem(QA_LOCAL_KEY, '1')
  } catch {
    // ignore
  }
}

function readPersistedQaFlag() {
  try {
    if (sessionStorage.getItem(QA_SESSION_KEY) === '1') return true
    if (localStorage.getItem(QA_LOCAL_KEY) === '1') return true
    if (sessionStorage.getItem(QA_SESSION_KEY_LEGACY) === '1') {
      persistQaFlag()
      return true
    }
  } catch {
    // ignore
  }
  return false
}

function parseQaFromSearch(search = '') {
  if (!search) return false
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
  return params.get('qa') === '1'
}

export function activateQaMode({ log = true } = {}) {
  persistQaFlag()
  if (log) {
    console.info('[QA] enabled', true)
  }
  return true
}

export function isQaMode(searchString) {
  if (typeof window === 'undefined') return false

  const search =
    searchString ??
    window.location.search ??
    ''

  try {
    if (parseQaFromSearch(search)) {
      return activateQaMode()
    }

    return readPersistedQaFlag()
  } catch {
    return parseQaFromSearch(search)
  }
}

/** Sincroniza ?qa=1 → storage en cada navegación. */
export function syncQaModeFromUrl(searchString) {
  return isQaMode(searchString)
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

  const active = useMemo(() => {
    return isQaMode(location.search)
  }, [location.search, location.pathname])

  return {
    isQaActive: active,
    isDevMode: isDevMode(),
    showQaTools: active || isDevMode(),
    canUseTestFigure: active || isDevMode(),
    withQa: (path) => withQaParam(path, active),
  }
}
