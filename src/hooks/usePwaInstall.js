import { useCallback, useSyncExternalStore } from 'react'
import {
  getPwaInstallSnapshot,
  promptPwaInstall,
  subscribePwaInstall,
} from '../utils/pwaInstallController'
import { pwaLog } from '../utils/pwaLog'

function getServerSnapshot() {
  return {
    isInstalled: false,
    isIos: false,
    isSafari: false,
    isInAppBrowser: false,
    nativePlatform: false,
    canPromptInstall: false,
    showInstallCta: false,
    hasDeferredPrompt: false,
    blockedReason: null,
  }
}

export function usePwaInstall() {
  const snapshot = useSyncExternalStore(
    subscribePwaInstall,
    getPwaInstallSnapshot,
    getServerSnapshot,
  )

  const promptInstall = useCallback(async () => {
    if (import.meta.env.DEV) {
      pwaLog('promptInstall tapped', {
        canPrompt: snapshot.canPromptInstall,
        blockedReason: snapshot.blockedReason,
      })
    }
    return promptPwaInstall()
  }, [snapshot.blockedReason, snapshot.canPromptInstall])

  return {
    isInstalled: snapshot.isInstalled,
    isIos: snapshot.isIos,
    isSafari: snapshot.isSafari,
    isInAppBrowser: snapshot.isInAppBrowser,
    nativePlatform: snapshot.nativePlatform,
    canPromptInstall: snapshot.canPromptInstall,
    showInstallCta: snapshot.showInstallCta,
    hasDeferredPrompt: snapshot.hasDeferredPrompt,
    blockedReason: snapshot.blockedReason,
    promptInstall,
  }
}
