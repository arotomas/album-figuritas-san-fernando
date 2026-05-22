import { useCallback, useEffect, useState } from 'react'
import { getQaState, subscribeQaState } from '../utils/diagnostics'

async function queryPermission(name) {
  if (!navigator.permissions?.query) return 'unknown'

  try {
    const status = await navigator.permissions.query({ name })
    return status.state
  } catch {
    return 'unknown'
  }
}

/**
 * Estado unificado de permisos GPS y cámara (donde el browser lo soporta).
 */
export function usePermissionState({ watch = true } = {}) {
  const [geoPermission, setGeoPermission] = useState('unknown')
  const [cameraPermission, setCameraPermission] = useState('unknown')
  const [forceDenied, setForceDenied] = useState(false)

  const refresh = useCallback(async () => {
    const qa = getQaState()
    setForceDenied(qa.forcePermissionDenied)

    if (qa.forcePermissionDenied) {
      setGeoPermission('denied')
      setCameraPermission('denied')
      return
    }

    const [geo, camera] = await Promise.all([
      queryPermission('geolocation'),
      queryPermission('camera'),
    ])

    setGeoPermission(geo)
    setCameraPermission(camera)
  }, [])

  useEffect(() => {
    if (!watch) return

    refresh()

    let geoStatus = null
    let cameraStatus = null

    async function attachListeners() {
      try {
        geoStatus = await navigator.permissions?.query({ name: 'geolocation' })
        geoStatus?.addEventListener?.('change', refresh)
      } catch {
        // ignore
      }

      try {
        cameraStatus = await navigator.permissions?.query({ name: 'camera' })
        cameraStatus?.addEventListener?.('change', refresh)
      } catch {
        // ignore
      }
    }

    attachListeners()
    const unsubQa = subscribeQaState(refresh)

    return () => {
      geoStatus?.removeEventListener?.('change', refresh)
      cameraStatus?.removeEventListener?.('change', refresh)
      unsubQa()
    }
  }, [watch, refresh])

  return {
    geoPermission: forceDenied ? 'denied' : geoPermission,
    cameraPermission: forceDenied ? 'denied' : cameraPermission,
    refresh,
    isGeoDenied: forceDenied || geoPermission === 'denied',
    isCameraDenied: forceDenied || cameraPermission === 'denied',
  }
}
