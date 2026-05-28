import { useEffect, useState } from 'react'
import { isMapDebugFlagEnabled, MAP_DEBUG_FLAG } from '../config/mapDebug'
import { mapDebugLog } from '../utils/mapDebugLog'

function readUnitHeight(unit) {
  if (typeof document === 'undefined') return null

  const probe = document.createElement('div')
  probe.style.cssText = `position:fixed;height:100${unit};width:0;visibility:hidden;pointer-events:none;`
  document.body.appendChild(probe)
  const height = getComputedStyle(probe).height
  document.body.removeChild(probe)
  return height
}

function readSafeAreaInsets() {
  if (typeof document === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 }
  }

  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;top:0;left:0;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);visibility:hidden;pointer-events:none;'
  document.body.appendChild(probe)
  const style = getComputedStyle(probe)
  const top = parseFloat(style.paddingTop) || 0
  const right = parseFloat(style.paddingRight) || 0
  const bottom = parseFloat(style.paddingBottom) || 0
  const left = parseFloat(style.paddingLeft) || 0
  document.body.removeChild(probe)

  return { top, bottom, left, right }
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

let lastViewportHeight = 0
let lastViewportOffsetTop = 0
let viewportVarsInitialized = false

function applyViewportVars() {
  const viewportSyncDisabled = isMapDebugFlagEnabled(MAP_DEBUG_FLAG.VIEWPORT_SYNC)
  if (viewportSyncDisabled && viewportVarsInitialized) {
    mapDebugLog('viewport', 'applyViewportVars skipped (MAP_DEBUG_DISABLE_VIEWPORT_SYNC)')
    return
  }

  const root = document.documentElement
  const vv = window.visualViewport
  const height = Math.round(vv?.height ?? window.innerHeight)
  const offsetTop = Math.round(vv?.offsetTop ?? 0)
  const heightDelta = Math.abs(height - lastViewportHeight)
  const offsetDelta = Math.abs(offsetTop - lastViewportOffsetTop)

  if (
    lastViewportHeight > 0 &&
    heightDelta < 3 &&
    offsetDelta < 3
  ) {
    return
  }

  mapDebugLog('viewport', 'viewport-update dispatched', {
    height,
    offsetTop,
    heightDelta,
    offsetDelta,
    innerHeight: window.innerHeight,
  })

  lastViewportHeight = height
  lastViewportOffsetTop = offsetTop

  const keyboardOpen = height < window.innerHeight * 0.78
  const standalone = isStandaloneMode()

  root.style.setProperty('--app-height', `${height}px`)
  root.style.setProperty('--vv-offset-top', `${offsetTop}px`)
  root.classList.toggle('keyboard-open', keyboardOpen)
  root.classList.toggle('standalone', standalone)

  viewportVarsInitialized = true
  window.dispatchEvent(new CustomEvent('viewport-update'))
}

export function readViewportMetrics() {
  if (typeof window === 'undefined') return null

  const root = document.documentElement
  const style = getComputedStyle(root)
  const safe = readSafeAreaInsets()
  const isStandalone = isStandaloneMode()

  return {
    appHeight: style.getPropertyValue('--app-height').trim(),
    innerHeight: window.innerHeight,
    visualViewportHeight: window.visualViewport?.height ?? null,
    visualViewportOffsetTop: window.visualViewport?.offsetTop ?? 0,
    dvh100: readUnitHeight('dvh'),
    svh100: readUnitHeight('svh'),
    lvh100: readUnitHeight('lvh'),
    standalone: isStandalone,
    keyboardOpen: root.classList.contains('keyboard-open'),
    safeArea: safe,
    displayMode: isStandalone ? 'standalone' : 'browser',
  }
}

/** Sincroniza --app-height con visualViewport (Chrome Android, teclado, PWA). */
export function useViewport() {
  useEffect(() => {
    applyViewportVars()

    const onChange = () => applyViewportVars()

    window.visualViewport?.addEventListener('resize', onChange)
    window.addEventListener('resize', onChange)
    window.addEventListener('orientationchange', onChange)

    return () => {
      window.visualViewport?.removeEventListener('resize', onChange)
      window.removeEventListener('resize', onChange)
      window.removeEventListener('orientationchange', onChange)
    }
  }, [])
}

export function useViewportMetrics() {
  const [metrics, setMetrics] = useState(() => readViewportMetrics())

  useEffect(() => {
    const refresh = () => setMetrics(readViewportMetrics())
    refresh()
    window.addEventListener('viewport-update', refresh)
    return () => window.removeEventListener('viewport-update', refresh)
  }, [])

  return metrics
}
