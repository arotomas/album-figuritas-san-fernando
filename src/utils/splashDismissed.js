import { SPLASH_DISMISSED_STORAGE_KEY } from '../config/splash'

export function hasSplashBeenDismissed() {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(SPLASH_DISMISSED_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function markSplashDismissed() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(SPLASH_DISMISSED_STORAGE_KEY, '1')
  } catch {
    // ignore quota / private mode
  }
}
