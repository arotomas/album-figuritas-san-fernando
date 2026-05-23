import { useCallback, useEffect, useRef, useState } from 'react'
import { isGooglePlacesConfigured } from '../config/googlePlaces'
import { loadGoogleMapsPlaces } from '../utils/loadGoogleMaps'
import {
  createPlacesSession,
  refreshPlacesSession,
  requestPlacePredictions,
} from '../utils/googlePlacesService'

export function usePlacesAutocomplete(input, { enabled = true, minLength = 3 } = {}) {
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const sessionRef = useRef(null)

  useEffect(() => {
    if (!enabled || !isGooglePlacesConfigured()) {
      setReady(false)
      setError(isGooglePlacesConfigured() ? null : 'GOOGLE_MAPS_API_KEY_MISSING')
      return
    }

    let cancelled = false

    loadGoogleMapsPlaces()
      .then((google) => {
        if (cancelled) return
        sessionRef.current = createPlacesSession(google)
        setReady(true)
        setError(null)
      })
      .catch((loadError) => {
        if (cancelled) return
        setReady(false)
        setError(loadError?.message ?? 'GOOGLE_MAPS_LOAD_FAILED')
      })

    return () => {
      cancelled = true
    }
  }, [enabled])

  useEffect(() => {
    const trimmed = input.trim()
    if (!enabled || !ready || !sessionRef.current || trimmed.length < minLength) {
      setPredictions([])
      setLoading(false)
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await requestPlacePredictions(sessionRef.current, trimmed)
        if (!cancelled) setPredictions(results)
      } catch {
        if (!cancelled) setPredictions([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 260)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [enabled, input, minLength, ready])

  const resetSession = useCallback(() => {
    if (!sessionRef.current) return
    sessionRef.current = refreshPlacesSession(sessionRef.current)
  }, [])

  const getSessionToken = useCallback(() => sessionRef.current?.sessionToken ?? null, [])

  return {
    predictions,
    loading,
    ready,
    error,
    resetSession,
    getSessionToken,
  }
}
