import { bootLog, bootWarn } from './bootLog'
import { pwaLog, pwaWarn } from './pwaLog'

let deferredPrompt = null
let installedFlag = false
let initialized = false
let initFailed = false
const listeners = new Set()

let cachedSnapshot = null

function safeMatchMedia(query) {
  try {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return null
    }
    return window.matchMedia(query)
  } catch {
    return null
  }
}

export function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  try {
    const standaloneMedia = safeMatchMedia('(display-mode: standalone)')
    const fullscreenMedia = safeMatchMedia('(display-mode: fullscreen)')
    return (
      standaloneMedia?.matches === true ||
      fullscreenMedia?.matches === true ||
      window.navigator?.standalone === true
    )
  } catch {
    return false
  }
}

/** iPhone/iPad — incluye iPadOS con UA de Mac. */
export function isIosDevice() {
  if (typeof navigator === 'undefined') return false
  try {
    const ua = navigator.userAgent
    const isClassicIos = /iPad|iPhone|iPod/.test(ua)
    const isIpadOs =
      navigator.platform === 'MacIntel' && Number(navigator.maxTouchPoints) > 1
    return isClassicIos || isIpadOs
  } catch {
    return false
  }
}

export function isIosSafari() {
  if (!isIosDevice()) return false
  try {
    const ua = navigator.userAgent
    return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  } catch {
    return false
  }
}

/** Instagram, WhatsApp, etc. — no permiten instalar PWA. */
export function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false
  try {
    const ua = navigator.userAgent
    return /(FBAN|FBAV|Instagram|Twitter|LinkedInApp|WhatsApp|Telegram|Snapchat|Line\/|GSA\/)/i.test(
      ua,
    )
  } catch {
    return false
  }
}

/** Chromium/Android/desktop donde puede existir beforeinstallprompt. */
export function isNativeInstallPlatform() {
  if (typeof navigator === 'undefined') return false
  try {
    const ua = navigator.userAgent
    if (isIosDevice()) return false
    if (/Android/i.test(ua)) {
      return /Chrome|EdgA|SamsungBrowser/i.test(ua)
    }
    return /Chrome|Edg\//i.test(ua) && !/Mobile/i.test(ua)
  } catch {
    return false
  }
}

function invalidateSnapshot() {
  cachedSnapshot = null
}

function notify() {
  invalidateSnapshot()
  listeners.forEach((listener) => listener())
}

function readInstalled() {
  return installedFlag || isStandaloneMode()
}

function buildSnapshot() {
  const isInstalled = readInstalled()
  const canPromptInstall = Boolean(deferredPrompt) && !isInstalled
  const isIos = isIosDevice()
  const isSafari = isIosSafari()
  const inAppBrowser = isInAppBrowser()
  const nativePlatform = isNativeInstallPlatform()

  const showInstallCta =
    !initFailed &&
    !isInstalled &&
    (inAppBrowser || isIos || canPromptInstall || nativePlatform)

  return {
    isInstalled,
    isIos,
    isSafari,
    isInAppBrowser: inAppBrowser,
    nativePlatform,
    canPromptInstall,
    showInstallCta,
    hasDeferredPrompt: Boolean(deferredPrompt),
    blockedReason: showInstallCta ? null : getPwaInstallBlockedReason(),
    initFailed,
  }
}

export function getPwaInstallBlockedReason() {
  if (initFailed) return 'init-failed'
  if (readInstalled()) return 'standalone'
  if (isIosDevice()) return null
  if (deferredPrompt) return null
  if (isNativeInstallPlatform()) return 'prompt-not-captured-yet'
  return 'platform-no-native-prompt'
}

export function getPwaInstallSnapshot() {
  if (cachedSnapshot) return cachedSnapshot
  cachedSnapshot = buildSnapshot()
  return cachedSnapshot
}

export function subscribePwaInstall(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function initPwaInstallCapture() {
  if (typeof window === 'undefined' || initialized) return
  initialized = true

  try {
    installedFlag = isStandaloneMode()
    invalidateSnapshot()

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
      try {
        event.preventDefault()
        deferredPrompt = event
        pwaLog('beforeinstallprompt received')
        pwaLog('install available')
        notify()
      } catch (error) {
        pwaWarn('beforeinstallprompt handler failed', error?.message)
      }
    })

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null
      installedFlag = true
      pwaLog('appinstalled — standalone assumed')
      notify()
    })

    const media = safeMatchMedia('(display-mode: standalone)')
    const onDisplayModeChange = () => {
      try {
        const next = isStandaloneMode()
        if (next !== installedFlag) {
          installedFlag = next
          if (next) {
            deferredPrompt = null
            pwaLog('standalone detected')
          }
          notify()
        }
      } catch (error) {
        pwaWarn('display-mode change failed', error?.message)
      }
    }

    if (media && typeof media.addEventListener === 'function') {
      media.addEventListener('change', onDisplayModeChange)
    } else if (media && typeof media.addListener === 'function') {
      media.addListener(onDisplayModeChange)
    }

    if (!installedFlag && !isIosDevice() && isNativeInstallPlatform() && !deferredPrompt) {
      pwaWarn('install blocked reason', getPwaInstallBlockedReason())
    }

    bootLog('pwa install capture ready')
  } catch (error) {
    initFailed = true
    invalidateSnapshot()
    bootWarn('pwa install capture failed — app continues', error?.message)
    pwaWarn('init failed — install CTA disabled', error?.message)
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
