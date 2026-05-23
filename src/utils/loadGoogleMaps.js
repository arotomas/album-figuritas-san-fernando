import { GOOGLE_MAPS_API_KEY } from '../config/googlePlaces'

let loadPromise = null

export function loadGoogleMapsPlaces() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('GOOGLE_MAPS_UNAVAILABLE'))
  }

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google)
  }

  const key = GOOGLE_MAPS_API_KEY?.trim()
  if (!key) {
    return Promise.reject(new Error('GOOGLE_MAPS_API_KEY_MISSING'))
  }

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&language=es&region=AR`
      script.async = true
      script.defer = true
      script.onload = () => {
        if (window.google?.maps?.places) {
          resolve(window.google)
          return
        }
        reject(new Error('GOOGLE_MAPS_PLACES_UNAVAILABLE'))
      }
      script.onerror = () => reject(new Error('GOOGLE_MAPS_SCRIPT_FAILED'))
      document.head.appendChild(script)
    })
  }

  return loadPromise
}
