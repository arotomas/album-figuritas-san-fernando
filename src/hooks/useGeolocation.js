import { useCallback, useEffect, useRef, useState } from 'react'
import { getCurrentPosition, watchPosition } from '../services/geoService'
import { throttle } from '../utils/performance'
import { cancelScheduled } from '../utils/cleanup'
import { classifyGeoError } from '../utils/recovery'
import { getQaState, subscribeQaState } from '../utils/diagnostics'
import { useGpsRecovery } from './useGpsRecovery'
import {
  GPS_FAST_OPTIONS,
  GPS_REFINE_OPTIONS,
  GPS_HARD_ERROR_MS,
  GPS_MAX_TIMEOUTS_BEFORE_WARN,
  GPS_UPDATE_INTERVAL_MS,
  GPS_ACCEPT_MAX_ACCURACY_M,
  GPS_PROXIMITY_MAX_ACCURACY_M,
  canUseProximity,
  getAccuracyTier,
  getGpsPhase,
  getGpsQualityState,
  getGpsStatusLabel,
  isWithinSanFernandoArea,
} from '../config/gps'
import {
  estimateFixSource,
  getFixAgeMs,
  isAbsurdJump,
  normalizeGeoPosition,
  rejectFixReason,
  shouldReplacePosition,
} from '../utils/gpsFilter'
import { gpsLog } from '../utils/gpsLog'
import { setGpsDiagnostics, getGpsDiagnostics } from '../utils/gpsDiagnostics'
import {
  loadLastKnownPosition,
  saveLastKnownPosition,
} from '../utils/lastKnownPosition'

function isAcceptedPosition(position) {
  if (!position) return false
  if (position.accuracy > GPS_ACCEPT_MAX_ACCURACY_M) return false
  return isWithinSanFernandoArea(position.lat, position.lng)
}

/**
 * Geolocalización en dos capas:
 * - Fix rápido (red/Wi‑Fi): solo mapa general, nunca proximidad.
 * - watchPosition high accuracy, maximumAge 0: fixes confiables filtrados.
 */
export function useGeolocation(options = {}) {
  const fastOptionsRef = useRef({ ...GPS_FAST_OPTIONS, ...options })
  const refineOptionsRef = useRef({ ...GPS_REFINE_OPTIONS, ...options })

  const stopRef = useRef(null)
  const permissionStatusRef = useRef(null)
  const throttledApplyRefinedRef = useRef(null)
  const initialCachedRef = useRef(loadLastKnownPosition())
  const hasAcceptedFixRef = useRef(Boolean(initialCachedRef.current))
  const positionRef = useRef(
    initialCachedRef.current
      ? { ...initialCachedRef.current, phase: 'cached' }
      : null,
  )
  const startWatchingRef = useRef(null)
  const coarsePreviewRef = useRef(null)
  const startTimeRef = useRef(Date.now())
  const timeoutCountRef = useRef(0)
  const updateCountRef = useRef(0)
  const discardCountRef = useRef(0)

  const [position, setPosition] = useState(() => loadLastKnownPosition())
  const [coarsePreview, setCoarsePreview] = useState(null)
  const [error, setError] = useState(null)
  const [errorType, setErrorType] = useState(null)
  const [isLoading, setIsLoading] = useState(() => !loadLastKnownPosition())
  const [isRefining, setIsRefining] = useState(false)
  const [permission, setPermission] = useState('prompt')
  const [gpsPhase, setGpsPhase] = useState('searching')
  const [gpsStatusLabel, setGpsStatusLabel] = useState('Buscando ubicación…')
  const [accuracyTier, setAccuracyTier] = useState('none')
  const [qualityState, setQualityState] = useState('searching')
  const [updateCount, setUpdateCount] = useState(0)
  const [timeToFirstFixMs, setTimeToFirstFixMs] = useState(null)
  const [showSoftWarning, setShowSoftWarning] = useState(false)
  const [lastDiscarded, setLastDiscarded] = useState(null)
  const [usingFallbackPosition, setUsingFallbackPosition] = useState(
    () => Boolean(initialCachedRef.current),
  )

  const syncDerivedState = useCallback((nextPosition, refining) => {
    const tier = getAccuracyTier(nextPosition?.accuracy)
    const quality = getGpsQualityState(nextPosition)
    const hasPosition = Boolean(nextPosition)
    const phase = getGpsPhase({
      hasPosition,
      accuracyTier: tier,
      qualityState: quality,
    })

    setAccuracyTier(tier)
    setQualityState(quality)
    setGpsPhase(phase)
    setGpsStatusLabel(getGpsStatusLabel(phase, tier, quality))
    setIsRefining(refining)

    gpsLog.state({
      phase,
      tier,
      quality,
      accuracy: nextPosition?.accuracy,
      ageMs: nextPosition ? getFixAgeMs(nextPosition) : null,
      updates: updateCountRef.current,
      discards: discardCountRef.current,
    })

    setGpsDiagnostics({
      position: nextPosition,
      phase,
      tier,
      quality,
      accuracy: nextPosition?.accuracy ?? null,
      ageMs: nextPosition ? getFixAgeMs(nextPosition) : null,
      lat: nextPosition?.lat ?? null,
      lng: nextPosition?.lng ?? null,
      updates: updateCountRef.current,
      discards: discardCountRef.current,
      isRefining: refining,
    })
  }, [])

  const applyPositionRef = useRef(null)

  applyPositionRef.current = (nextPosition, { isFirstApply, source, phase }) => {
    updateCountRef.current += 1
    setUpdateCount(updateCountRef.current)

    const refining =
      nextPosition.accuracy > GPS_PROXIMITY_MAX_ACCURACY_M ||
      phase === 'coarse'

    positionRef.current = { ...nextPosition, phase }
    setPosition(nextPosition)
    setUsingFallbackPosition(false)
    saveLastKnownPosition(nextPosition)
    setIsLoading(false)
    setError(null)
    setErrorType(null)
    setShowSoftWarning(false)
    timeoutCountRef.current = 0
    syncDerivedState(nextPosition, refining)

    if (isFirstApply) {
      const elapsed = Date.now() - startTimeRef.current
      setTimeToFirstFixMs(elapsed)
      gpsLog.fix(`first accepted fix in ${elapsed}ms`, {
        accuracy: nextPosition.accuracy,
        lat: nextPosition.lat,
        lng: nextPosition.lng,
        source,
        ageMs: nextPosition.ageMs,
        phase,
      })
    } else {
      gpsLog.update({
        n: updateCountRef.current,
        accuracy: nextPosition.accuracy,
        source,
        ageMs: nextPosition.ageMs,
        phase,
      })
    }
  }

  const recordDiscard = useCallback((next, reason, meta = {}) => {
    discardCountRef.current += 1
    const payload = {
      reason,
      accuracy: next?.accuracy,
      ageMs: next?.ageMs,
      lat: next?.lat,
      lng: next?.lng,
      ...meta,
    }
    setLastDiscarded(payload)
    gpsLog.discard(payload)
    setGpsDiagnostics({
      ...getGpsDiagnostics(),
      lastDiscarded: payload,
      discards: discardCountRef.current,
    })
  }, [])

  const tryApplyFix = useCallback(
    (geoPosition, { phase, maximumAge, isCoarsePhase = false }) => {
      const next = normalizeGeoPosition(geoPosition, { phase })
      const source = estimateFixSource(geoPosition, { maximumAge })

      if (!isWithinSanFernandoArea(next.lat, next.lng)) {
        recordDiscard(next, 'outside_bounds', { source })
        return false
      }

      if (next.accuracy > GPS_ACCEPT_MAX_ACCURACY_M) {
        recordDiscard(next, 'accuracy_too_poor', { source })
        return false
      }

      const current = positionRef.current
      const rejectReason = rejectFixReason(current, next, {
        maximumAge,
        isCoarsePhase,
      })

      if (rejectReason) {
        recordDiscard(next, rejectReason, { source })
        return false
      }

      if (isCoarsePhase) {
        coarsePreviewRef.current = { ...next, source, isCoarse: true }
        setCoarsePreview(coarsePreviewRef.current)

        if (!current) {
          hasAcceptedFixRef.current = true
          applyPositionRef.current?.(next, {
            isFirstApply: true,
            source,
            phase: 'coarse',
          })
        }
        return true
      }

      if (!shouldReplacePosition(current, next)) {
        recordDiscard(next, 'worse_or_redundant', { source })
        return false
      }

      if (current && isAbsurdJump(current, next)) {
        recordDiscard(next, 'absurd_jump', { source })
        return false
      }

      const isFirst = !hasAcceptedFixRef.current
      hasAcceptedFixRef.current = true

      applyPositionRef.current?.(next, {
        isFirstApply: isFirst,
        source,
        phase: 'refined',
      })
      return true
    },
    [recordDiscard],
  )

  if (!throttledApplyRefinedRef.current) {
    throttledApplyRefinedRef.current = throttle((geoPosition) => {
      tryApplyFix(geoPosition, {
        phase: 'refined',
        maximumAge: refineOptionsRef.current.maximumAge,
        isCoarsePhase: false,
      })
    }, GPS_UPDATE_INTERVAL_MS)
  }

  const applyMockIfNeeded = useCallback(() => {
    const mock = getQaState().mockPosition
    if (mock) {
      const normalized = {
        ...mock,
        ageMs: 0,
        phase: 'refined',
        timestamp: mock.timestamp ?? Date.now(),
      }
      applyPositionRef.current?.(normalized, {
        isFirstApply: !hasAcceptedFixRef.current,
        source: 'mock',
        phase: 'refined',
      })
      hasAcceptedFixRef.current = true
      return true
    }
    return false
  }, [])

  const stopWatching = useCallback(() => {
    stopRef.current?.()
    stopRef.current = null
  }, [])

  const handleWatchError = useCallback(
    (geoError) => {
      const classified = classifyGeoError(geoError.code)
      timeoutCountRef.current += 1

      gpsLog.error(classified.type, {
        code: geoError.code,
        timeouts: timeoutCountRef.current,
        hasFix: hasAcceptedFixRef.current,
      })

      if (classified.type === 'denied') {
        setError(classified.message)
        setErrorType('denied')
        setIsLoading(false)
        return
      }

      if (positionRef.current && isAcceptedPosition(positionRef.current)) {
        setIsRefining(true)
        setIsLoading(false)
        if (classified.type === 'timeout') {
          setError('No pudimos mejorar la señal GPS. Usamos tu última ubicación.')
          setErrorType('timeout')
        }
        syncDerivedState(positionRef.current, true)
        return
      }

      const elapsed = Date.now() - startTimeRef.current
      const cached = loadLastKnownPosition()

      if (cached && !positionRef.current) {
        positionRef.current = { ...cached, phase: 'cached' }
        hasAcceptedFixRef.current = true
        setPosition(cached)
        setUsingFallbackPosition(true)
        setIsLoading(false)
        setError(
          classified.type === 'timeout'
            ? 'Ubicación demorada — mostramos la última posición conocida.'
            : classified.message,
        )
        setErrorType(classified.type)
        syncDerivedState(cached, true)
        return
      }

      if (
        timeoutCountRef.current >= GPS_MAX_TIMEOUTS_BEFORE_WARN &&
        !hasAcceptedFixRef.current &&
        elapsed > GPS_HARD_ERROR_MS / 2
      ) {
        setShowSoftWarning(true)
        setGpsStatusLabel('Señal débil — seguimos buscando…')
        setGpsPhase('searching')
      }

      if (!hasAcceptedFixRef.current && elapsed >= GPS_HARD_ERROR_MS) {
        setError(
          classified.type === 'timeout'
            ? 'No pudimos obtener tu ubicación. Probá al aire libre.'
            : classified.message,
        )
        setErrorType(classified.type)
        setIsLoading(false)
      }
    },
    [syncDerivedState],
  )

  const ingestCoarse = useCallback(
    (geoPosition) => {
      tryApplyFix(geoPosition, {
        phase: 'coarse',
        maximumAge: fastOptionsRef.current.maximumAge,
        isCoarsePhase: true,
      })
    },
    [tryApplyFix],
  )

  const ingestRefined = useCallback(
    (geoPosition) => {
      const current = positionRef.current
      const preview = normalizeGeoPosition(geoPosition, { phase: 'refined' })
      const shouldApplyImmediate =
        !current ||
        current.phase === 'coarse' ||
        preview.accuracy < (current.accuracy ?? Infinity) - 4

      if (shouldApplyImmediate) {
        tryApplyFix(geoPosition, {
          phase: 'refined',
          maximumAge: refineOptionsRef.current.maximumAge,
          isCoarsePhase: false,
        })
        return
      }

      throttledApplyRefinedRef.current(geoPosition)
    },
    [tryApplyFix],
  )

  const startWatching = useCallback(() => {
    if (getQaState().forcePermissionDenied) {
      setError('Permiso de ubicación denegado (simulado).')
      setErrorType('denied')
      setIsLoading(false)
      return
    }

    if (applyMockIfNeeded()) return

    stopWatching()
    startTimeRef.current = Date.now()
    timeoutCountRef.current = 0
    hasAcceptedFixRef.current = Boolean(positionRef.current)
    setError(null)
    setErrorType(null)
    setShowSoftWarning(false)

    if (!hasAcceptedFixRef.current) {
      setIsLoading(true)
      setGpsPhase('searching')
      setGpsStatusLabel('Buscando ubicación…')
    }

    getCurrentPosition(fastOptionsRef.current)
      .then(ingestCoarse)
      .catch((geoError) => {
        gpsLog.warn('coarse fix failed', geoError?.code)
      })

    stopRef.current = watchPosition(
      ingestRefined,
      handleWatchError,
      refineOptionsRef.current,
    )
  }, [
    applyMockIfNeeded,
    handleWatchError,
    ingestCoarse,
    ingestRefined,
    stopWatching,
  ])

  const handlePermissionChange = useCallback((event) => {
    setPermission(event.target.state)
  }, [])

  const requestPermission = useCallback(async () => {
    if (navigator.permissions?.query) {
      try {
        permissionStatusRef.current?.removeEventListener?.(
          'change',
          handlePermissionChange,
        )
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

  startWatchingRef.current = startWatching

  const requestPermissionRef = useRef(null)
  requestPermissionRef.current = requestPermission

  useEffect(() => {
    if (!position || !isRefining) return

    if (position.accuracy <= GPS_PROXIMITY_MAX_ACCURACY_M) {
      syncDerivedState(position, false)
    }
  }, [position, isRefining, syncDerivedState])

  useEffect(() => {
    if (initialCachedRef.current) {
      syncDerivedState(initialCachedRef.current, true)
    }
    requestPermissionRef.current?.()

    const unsubQa = subscribeQaState(() => {
      if (getQaState().mockPosition) applyMockIfNeeded()
      else if (getQaState().forcePermissionDenied) startWatchingRef.current?.()
    })

    return () => {
      unsubQa()
      cancelScheduled(throttledApplyRefinedRef.current)
      permissionStatusRef.current?.removeEventListener?.(
        'change',
        handlePermissionChange,
      )
      stopWatching()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const displayPosition = position ?? coarsePreview
  const proximityPosition = canUseProximity(position) ? position : null
  const hasUsablePosition = Boolean(proximityPosition)

  return {
    position: displayPosition,
    trustedPosition: position,
    coarsePreview,
    proximityPosition,
    hasUsablePosition,
    canUseProximity: hasUsablePosition,
    error,
    errorType,
    isLoading: isLoading && !hasAcceptedFixRef.current,
    isRefining,
    gpsPhase,
    gpsStatusLabel,
    accuracyTier,
    qualityState,
    showSoftWarning,
    permission,
    requestPermission,
    stopWatching,
    updateCount,
    timeToFirstFixMs,
    discardCount: discardCountRef.current,
    lastDiscarded,
    usingFallbackPosition,
  }
}
