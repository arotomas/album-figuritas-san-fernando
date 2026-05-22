import { useCallback, useEffect, useRef, useState } from 'react'
import { watchPosition } from '../services/geoService'
import { throttle } from '../utils/performance'
import { cancelScheduled } from '../utils/cleanup'
import { classifyGeoError } from '../utils/recovery'
import { getQaState, subscribeQaState } from '../utils/diagnostics'
import { useGpsRecovery } from './useGpsRecovery'

const DEFAULT_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 8_000,
  timeout: 20_000,
}

const UPDATE_INTERVAL_MS = 1_200

/**
 * Geolocalización con throttling, cleanup y recovery desde background.
 */
export function useGeolocation(options = {}) {
  const watchOptionsRef = useRef({ ...DEFAULT_OPTIONS, ...options })
  watchOptionsRef.current = { ...DEFAULT_OPTIONS, ...options }

  const stopRef = useRef(null)
  const permissionStatusRef = useRef(null)
  const throttledSetPositionRef = useRef(null)

  const [position, setPosition] = useState(null)
  const [error, setError] = useState(null)
  const [errorType, setErrorType] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [permission, setPermission] = useState('prompt')

  if (!throttledSetPositionRef.current) {
    throttledSetPositionRef.current = throttle((nextPosition) => {
      setPosition(nextPosition)
      setIsLoading(false)
      setError(null)
      setErrorType(null)
    }, UPDATE_INTERVAL_MS)
  }

  const applyMockIfNeeded = useCallback(() => {
    const mock = getQaState().mockPosition
    if (mock) {
      throttledSetPositionRef.current(mock)
      return true
    }
    return false
  }, [])

  const stopWatching = useCallback(() => {
    stopRef.current?.()
    stopRef.current = null
  }, [])

  const startWatching = useCallback(() => {
    if (getQaState().forcePermissionDenied) {
      setError('Permiso de ubicación denegado (simulado).')
      setErrorType('denied')
      setIsLoading(false)
      return
    }

    if (applyMockIfNeeded()) return

    stopWatching()
    setIsLoading(true)
    setError(null)
    setErrorType(null)

    stopRef.current = watchPosition(
      (geoPosition) => {
        throttledSetPositionRef.current({
          lat: geoPosition.coords.latitude,
          lng: geoPosition.coords.longitude,
          accuracy: geoPosition.coords.accuracy,
          heading: geoPosition.coords.heading,
          timestamp: geoPosition.timestamp,
        })
      },
      (geoError) => {
        const classified = classifyGeoError(geoError.code)
        setError(classified.message)
        setErrorType(classified.type)
        setIsLoading(false)
      },
      watchOptionsRef.current,
    )
  }, [applyMockIfNeeded, stopWatching])

  const handlePermissionChange = useCallback((event) => {
    setPermission(event.target.state)
  }, [])

  const requestPermission = useCallback(async () => {
    if (navigator.permissions?.query) {
      try {
        permissionStatusRef.current?.removeEventListener?.('change', handlePermissionChange)
        const status = await navigator.permissions.query({ name: 'geolocation' })
        permissionStatusRef.current = status
        setPermission(status.state)
        status.addEventListener('change', handlePermissionChange)
      } catch {
        // Permissions API not fully supported
      }
    }

    startWatching()
  }, [handlePermissionChange, startWatching])

  useGpsRecovery({ stopWatching, requestPermission })

  useEffect(() => {
    requestPermission()

    const unsubQa = subscribeQaState(() => {
      if (getQaState().mockPosition) applyMockIfNeeded()
      else if (getQaState().forcePermissionDenied) startWatching()
    })

    return () => {
      unsubQa()
      cancelScheduled(throttledSetPositionRef.current)
      permissionStatusRef.current?.removeEventListener?.('change', handlePermissionChange)
      stopWatching()
    }
  }, [applyMockIfNeeded, requestPermission, startWatching, stopWatching])

  return {
    position,
    error,
    errorType,
    isLoading,
    permission,
    requestPermission,
    stopWatching,
  }
}
