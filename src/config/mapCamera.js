/**
 * Flag temporal: cámara desacoplada del GPS tras gesto manual.
 * Probar en celular: /map?map_free_camera=1
 * Legacy (sin flag): mismo URL sin query o ?map_free_camera=0
 */

const STORAGE_KEY = 'album-map-free-camera'

function readUrlFlag() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  if (!params.has('map_free_camera')) return null
  return params.get('map_free_camera') === '1'
}

export function isMapFreeCameraEnabled() {
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_MAP_FREE_CAMERA === 'true'
  }

  const fromUrl = readUrlFlag()
  if (fromUrl === true) {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }
    return true
  }
  if (fromUrl === false) {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    return false
  }

  if (import.meta.env.VITE_MAP_FREE_CAMERA === 'true') return true

  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}
