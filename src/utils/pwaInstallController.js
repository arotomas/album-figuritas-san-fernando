import { pwaLog, pwaWarn } from './pwaLog'

let deferredPrompt = null
let installedFlag = false
let initialized = false
const listeners = new Set()

export function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  )
}

/** iPhone/iPad — incluye iPadOS con UA de Mac. */
export function isIosDevice() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isClassicIos = /iPad|iPhone|iPod/.test(ua)
  const isIpadOs =
    navigator.platform === 'MacIntel' && Number(navigator.maxTouchPoints) > 1
  return isClassicIos || isIpadOs
}

export function isIosSafari() {
  if (!isIosDevice()) return false
  const ua = navigator.userAgent
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
}

/** Chromium/Android/desktop donde puede existir beforeinstallprompt. */
export function isNativeInstallPlatform() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (isIosDevice()) return false
  if (/Android/i.test(ua)) {
    return /Chrome|EdgA|SamsungBrowser/i.test(ua)
  }
  return /Chrome|Edg\//i.test(ua) && !/Mobile/i.test(ua)
}

function notify() {
  listeners.forEach((listener) => listener())
}

function readInstalled() {
  return installedFlag || isStandaloneMode()
}

export function getPwaInstallBlockedReason() {
  if (readInstalled()) return 'standalone'
  if (isIosDevice()) return null
  if (deferredPrompt) return null
  if (isNativeInstallPlatform()) return 'prompt-not-captured-yet'
  return 'platform-no-native-prompt'
}

export function getPwaInstallSnapshot() {
  const isInstalled = readInstalled()
  const canPromptInstall = Boolean(deferredPrompt) && !isInstalled
  const isIos = isIosDevice()
  const isSafari = isIosSafari()
  const nativePlatform = isNativeInstallPlatform()

  const showInstallCta =
    !isInstalled && (isIos || canPromptInstall || nativePlatform)

  return {
    isInstalled,
    isIos,
    isSafari,
    nativePlatform,
    canPromptInstall,
    showInstallCta,
    hasDeferredPrompt: Boolean(deferredPrompt),
    blockedReason: showInstallCta ? null : getPwaInstallBlockedReason(),
  }
}

export function subscribePwaInstall(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function initPwaInstallCapture() {
  if (typeof window === 'undefined' || initialized) return
  initialized = true

  installedFlag = isStandaloneMode()
  pwaLog('bootstrap', {
    standalone: installedFlag,
    ios: isIosDevice(),
    iosSafari: isIosSafari(),
    nativePlatform: isNativeInstallPlatform(),
  })

  if (installedFlag) {
    pwaLog('standalone detected')
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event
    pwaLog('beforeinstallprompt received')
    pwaLog('install available')
    notify()
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    installedFlag = true
    pwaLog('appinstalled — standalone assumed')
    notify()
  })

  const media = window.matchMedia('(display-mode: standalone)')
  const onDisplayModeChange = () => {
    const next = isStandaloneMode()
    if (next !== installedFlag) {
      installedFlag = next
      if (next) {
        deferredPrompt = null
        pwaLog('standalone detected')
      }
      notify()
    }
  }

  media.addEventListener?.('change', onDisplayModeChange)

  if (!installedFlag && !isIosDevice() && isNativeInstallPlatform() && !deferredPrompt) {
    pwaWarn('install blocked reason', getPwaInstallBlockedReason())
  }
}

export async function promptPwaInstall() {
  if (!deferredPrompt) {
    pwaWarn('install blocked reason', 'no-deferred-prompt')
    return { ok: false, reason: 'unavailable' }
  }

  try {
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    deferredPrompt = null
    notify()

    if (choice.outcome === 'accepted') {
      installedFlag = true
      notify()
      return { ok: true }
    }
    return { ok: false, reason: 'dismissed' }
  } catch (error) {
    pwaWarn('prompt failed', error?.message)
    return { ok: false, reason: 'error' }
  }
}
