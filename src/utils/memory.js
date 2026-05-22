import { STORAGE_KEY } from '../config/persistence'

export function getLocalStorageSizeBytes(key = STORAGE_KEY) {
  if (typeof localStorage === 'undefined') return 0

  try {
    const value = localStorage.getItem(key) ?? ''
    return new Blob([value]).size
  } catch {
    return 0
  }
}

export function getTotalLocalStorageBytes() {
  if (typeof localStorage === 'undefined') return 0

  let total = 0

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key) continue
      const value = localStorage.getItem(key) ?? ''
      total += new Blob([key + value]).size
    }
  } catch {
    return 0
  }

  return total
}

export function estimateImageMemoryBytes(figures) {
  return figures.reduce((total, figure) => {
    if (!figure.foto) return total
    return total + (figure.fotoSizeBytes ?? Math.round((figure.foto.length * 3) / 4))
  }, 0)
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function getPerformanceMemory() {
  if (typeof performance === 'undefined') return null
  return performance.memory ?? null
}
