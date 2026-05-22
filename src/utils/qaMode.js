import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { isDevMode } from './devMode'

const QA_SESSION_KEY = 'album-qa-mode'
const QA_SESSION_KEY_LEGACY = 'figuritas-qa-mode'

export function isQaMode() {
  if (typeof window === 'undefined') return false

  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('qa') === '1') {
      sessionStorage.setItem(QA_SESSION_KEY, '1')
      return true
    }

    if (sessionStorage.getItem(QA_SESSION_KEY) === '1') {
      return true
    }

    if (sessionStorage.getItem(QA_SESSION_KEY_LEGACY) === '1') {
      sessionStorage.setItem(QA_SESSION_KEY, '1')
      return true
    }

    return false
  } catch {
    return false
  }
}

/** @deprecated usar isQaMode */
export function syncQaModeFromUrl() {
  return isQaMode()
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
  const [, setTick] = useState(0)

  useEffect(() => {
    setTick((value) => value + 1)
  }, [location.search, location.pathname])

  const active = isQaMode()

  return {
    isQaActive: active,
    isDevMode: isDevMode(),
    showQaTools: active || isDevMode(),
    canUseTestFigure: active || isDevMode(),
    withQa: (path) => withQaParam(path, active),
  }
}
