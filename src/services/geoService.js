/**
 * Servicio de geolocalización — preparado para futura integración backend.
 * Por ahora delega en la Web Geolocation API del navegador.
 */

export function getCurrentPosition(options) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalización no disponible'))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

export function watchPosition(onSuccess, onError, options) {
  if (!navigator.geolocation) {
    onError?.({ code: 0, message: 'Geolocalización no disponible' })
    return () => {}
  }

  const watchId = navigator.geolocation.watchPosition(onSuccess, onError, options)
  return () => navigator.geolocation.clearWatch(watchId)
}
