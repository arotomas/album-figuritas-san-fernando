import {
  MAX_PHOTO_BYTES,
  MAX_TOTAL_STORAGE_BYTES,
  STORAGE_KEY,
} from '../../config/persistence'

function estimatePayloadSize(value) {
  try {
    return new Blob([value]).size
  } catch {
    return value?.length ?? 0
  }
}

export const storageService = {
  get(key = STORAGE_KEY) {
    if (typeof window === 'undefined') return null

    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },

  set(key = STORAGE_KEY, value) {
    if (typeof window === 'undefined') return false

    const size = estimatePayloadSize(value)

    if (size > MAX_TOTAL_STORAGE_BYTES) {
      console.warn('[storage] Payload excede límite seguro:', size)
      return false
    }

    try {
      localStorage.setItem(key, value)
      return true
    } catch (error) {
      console.warn('[storage] Error al guardar:', error.message)
      return false
    }
  },

  remove(key = STORAGE_KEY) {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  },

  clearAll() {
    this.remove(STORAGE_KEY)
  },

  isPhotoWithinLimit(sizeBytes) {
    return !sizeBytes || sizeBytes <= MAX_PHOTO_BYTES
  },
}

/** Adapter compatible con zustand/persist */
export function createZustandStorage() {
  return {
    getItem: (name) => {
      const value = storageService.get(name)
      return value ?? null
    },
    setItem: (name, value) => {
      storageService.set(name, value)
    },
    removeItem: (name) => {
      storageService.remove(name)
    },
  }
}
