import {
  MAX_PHOTO_BYTES,
  MAX_TOTAL_STORAGE_BYTES,
  STORAGE_KEY,
} from '../../config/persistence'
import { persistLog } from '../../utils/persistLog'

function estimatePayloadSize(value) {
  try {
    return new Blob([value]).size
  } catch {
    return value?.length ?? 0
  }
}

function isCorruptPayload(value) {
  return value === '[object Object]' || value === 'undefined'
}

export const storageService = {
  get(key = STORAGE_KEY) {
    if (typeof window === 'undefined') return null

    try {
      const value = localStorage.getItem(key)
      if (isCorruptPayload(value)) {
        persistLog.storageWarn('corrupt payload removed', key)
        localStorage.removeItem(key)
        return null
      }
      return value
    } catch (error) {
      persistLog.storageWarn('get failed', error)
      return null
    }
  },

  set(key = STORAGE_KEY, value) {
    if (typeof window === 'undefined') return false

    const size = estimatePayloadSize(value)

    if (size > MAX_TOTAL_STORAGE_BYTES) {
      persistLog.storageWarn('payload exceeds limit', size)
      return false
    }

    try {
      localStorage.setItem(key, value)
      persistLog.storage('saved', key, `${Math.round(size / 1024)}KB`)
      return true
    } catch (error) {
      persistLog.storageWarn('set failed', error.message)
      return false
    }
  },

  remove(key = STORAGE_KEY) {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(key)
      persistLog.storage('removed', key)
    } catch (error) {
      persistLog.storageWarn('remove failed', error)
    }
  },

  clearAll() {
    this.remove(STORAGE_KEY)
  },

  isPhotoWithinLimit(sizeBytes) {
    return !sizeBytes || sizeBytes <= MAX_PHOTO_BYTES
  },
}

/** Adapter compatible con zustand/persist — instancia singleton */
let zustandStorageAdapter = null

export function createZustandStorage() {
  if (zustandStorageAdapter) return zustandStorageAdapter

  zustandStorageAdapter = {
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

  return zustandStorageAdapter
}
