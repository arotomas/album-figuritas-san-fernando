import { useCallback, useEffect, useState } from 'react'

function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function isIosSafari() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  return isIos && isSafari
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneMode())
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    setIsIos(isIosSafari())
    setIsInstalled(isStandaloneMode())

    const onBeforeInstall = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }

    const onInstalled = () => {
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    const media = window.matchMedia('(display-mode: standalone)')
    const onDisplayModeChange = () => setIsInstalled(isStandaloneMode())

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    media.addEventListener?.('change', onDisplayModeChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      media.removeEventListener?.('change', onDisplayModeChange)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return { ok: false, reason: 'unavailable' }

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      if (choice.outcome === 'accepted') {
        setIsInstalled(true)
        return { ok: true }
      }
      return { ok: false, reason: 'dismissed' }
    } catch {
      return { ok: false, reason: 'error' }
    }
  }, [deferredPrompt])

  const canPromptInstall = Boolean(deferredPrompt) && !isInstalled
  const showInstallCta = !isInstalled && (canPromptInstall || isIos)

  return {
    isInstalled,
    isIos,
    canPromptInstall,
    showInstallCta,
    promptInstall,
  }
}
