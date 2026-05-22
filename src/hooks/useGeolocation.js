import { useCallback, useEffect, useRef, useState } from 'react'
import { getCurrentPosition, watchPosition } from '../services/geoService'
import { throttle } from '../utils/performance'
import { cancelScheduled } from '../utils/cleanup'
import { classifyGeoError } from '../utils/recovery'
import { getQaState, subscribeQaState } from '../utils/diagnostics'
import { useGpsRecovery } from './useGpsRecovery'
import {
  GPS_HIGH_ACCURACY_OPTIONS,
  GPS_HARD_ERROR_MS,
  GPS_MAX_TIMEOUTS_BEFORE_WARN,
  GPS_UPDATE_INTERVAL_MS,
  GPS_ACCEPT_MAX_ACCURACY_M,
  GPS_PROXIMITY_MAX_ACCURACY_M,
  GPS_INITIAL_FIX_RETRY_MS,
  GPS_INITIAL_FIX_MAX_ATTEMPTS,
  GPS_NO_FIX_TIMEOUT_MS,
  GPS_STALL_TIMEOUT_MS,
  GPS_STALLED_LABEL,
  GPS_ACQUISITION_LABEL,
  GPS_NO_FIX_MESSAGE,
  DEBUG_GPS,
  canUseProximity,
  getAccuracyTier,
  getApproximateLocationMessage,
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
import { patchGpsDiagnostics, getGpsDiagnostics } from '../utils/gpsDiagnostics'
import { saveLastKnownPosition, clearLastKnownPosition } from '../utils/lastKnownPosition'

const GEOLOCATION_AVAILABLE =
  typeof navigator !== 'undefined' && Boolean(navigator.geolocation)

function isAcceptedPosition(position) {
  if (!position) return false
  if (position.accuracy > GPS_ACCEPT_MAX_ACCURACY_M) return false
  return isWithinSanFernandoArea(position.lat, position.lng)
}

/**
 * Geolocalización de alta precisión: siempre pide fix fresco al abrir/refrescar.
 * Lecturas >80m se muestran en mapa (preview) pero no se aceptan para proximidad/captura.
 */
export function useGeolocation(options = {}) {
  const geoOptionsRef = useRef({ ...GPS_HIGH_ACCURACY_OPTIONS, ...options })

  const stopRef = useRef(null)
  const permissionStatusRef = useRef(null)
  const throttledApplyRefinedRef = useRef(null)
  const hasAcceptedFixRef = useRef(false)
  const positionRef = useRef(null)
  const startWatchingRef = useRef(null)
  const startTimeRef = useRef(Date.now())
  const timeoutCountRef = useRef(0)
  const updateCountRef = useRef(0)
  const discardCountRef = useRef(0)
  const hasAnyFixRef = useRef(false)
  const acquisitionGenerationRef = useRef(0)
  const initialRetryTimersRef = useRef([])
  const noFixTimerRef = useRef(null)
  const stallTimerRef = useRef(null)
  const lastGpsUpdateAtRef = useRef(null)
  const lastValidFixAtRef = useRef(null)
  const stallLoggedRef = useRef(false)

  const [position, setPosition] = useState(null)
  const [error, setError] = useState(null)
  const [errorType, setErrorType] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
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
  const [lastRawReading, setLastRawReading] = useState(null)
  const [previewPosition, setPreviewPosition] = useState(null)
  const [lastFixOutcome, setLastFixOutcome] = useState(null)
  const [isWatching, setIsWatching] = useState(false)
  const [approximateMessage, setApproximateMessage] = useState(null)
  const [acquisitionStatus, setAcquisitionStatus] = useState('initializing')
  const [acquisitionMessage, setAcquisitionMessage] = useState(
    GPS_ACQUISITION_LABEL.initializing,
  )
  const [lastValidFixAt, setLastValidFixAt] = useState(null)
  const [isGpsStalled, setIsGpsStalled] = useState(false)

  const clearStallTimer = useCallback(() => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current)
      stallTimerRef.current = null
    }
  }, [])

  const scheduleStallCheck = useCallback(() => {
    clearStallTimer()
    if (!stopRef.current) return

    stallTimerRef.current = setTimeout(() => {
      if (!stopRef.current) return
      if (!lastGpsUpdateAtRef.current) return

      setIsGpsStalled(true)
      if (!stallLoggedRef.current) {
        stallLoggedRef.current = true
        gpsLog.stalledNoUpdates({
          elapsedMs: Date.now() - lastGpsUpdateAtRef.current,
          lastUpdateAt: lastGpsUpdateAtRef.current,
        })
      }
      patchGpsDiagnostics({
        isGpsStalled: true,
        gpsStalledMessage: GPS_STALLED_LABEL,
        lastValidFixAt: lastValidFixAtRef.current,
      })
    }, GPS_STALL_TIMEOUT_MS)
  }, [clearStallTimer])

  const recordGpsUpdate = useCallback(
    (reading, meta = {}) => {
      const now = Date.now()
      const fixAt = reading?.timestamp ?? now

      lastGpsUpdateAtRef.current = now
      lastValidFixAtRef.current = fixAt
      stallLoggedRef.current = false
      setIsGpsStalled(false)
      setLastValidFixAt(fixAt)

      gpsLog.lastValidFix({
        at: fixAt,
        lat: reading?.lat,
        lng: reading?.lng,
        accuracy: reading?.accuracy,
        source: meta.apiSource,
      })

      patchGpsDiagnostics({
        lastValidFixAt: fixAt,
        isGpsStalled: false,
        gpsStalledMessage: null,
        lastGpsUpdateAt: now,
      })

      scheduleStallCheck()
    },
    [scheduleStallCheck],
  )

  const clearAcquisitionTimers = useCallback(() => {
    initialRetryTimersRef.current.forEach(clearTimeout)
    initialRetryTimersRef.current = []
    if (noFixTimerRef.current) {
      clearTimeout(noFixTimerRef.current)
      noFixTimerRef.current = null
    }
  }, [])

  const markAnyFixReceived = useCallback(() => {
    if (hasAnyFixRef.current) return
    hasAnyFixRef.current = true
    clearAcquisitionTimers()
    setAcquisitionStatus('ready')
    setAcquisitionMessage(GPS_ACQUISITION_LABEL.ready)
    setIsLoading(false)
    patchGpsDiagnostics({
      acquisitionStatus: 'ready',
      acquisitionMessage: GPS_ACQUISITION_LABEL.ready,
    })
  }, [clearAcquisitionTimers])

  const markAnyFixReceivedRef = useRef(markAnyFixReceived)
  markAnyFixReceivedRef.current = markAnyFixReceived

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

    patchGpsDiagnostics({
      position: nextPosition,
      previewPosition: getGpsDiagnostics()?.previewPosition ?? null,
      trustedPosition: nextPosition,
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
      lastFixOutcome: 'accepted',
      isLocationAccepted: true,
      lastRawReading: nextPosition,
      isWatching: Boolean(stopRef.current),
      geolocationAvailable: GEOLOCATION_AVAILABLE,
      error: null,
      errorType: null,
      permission: permissionStatusRef.current?.state ?? null,
      lastSavedPosition: null,
      approximateMessage: null,
    })
  }, [])

  const applyPositionRef = useRef(null)

  applyPositionRef.current = (nextPosition, { isFirstApply, source, phase, apiSource }) => {
    updateCountRef.current += 1
    setUpdateCount(updateCountRef.current)

    const refining = nextPosition.accuracy > GPS_PROXIMITY_MAX_ACCURACY_M

    positionRef.current = { ...nextPosition, phase }
    setPosition(nextPosition)
    setPreviewPosition(nextPosition)
    setLastRawReading(nextPosition)
    setLastFixOutcome('accepted')
    setApproximateMessage(null)
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
        apiSource: apiSource ?? source,
        ageMs: nextPosition.ageMs,
        phase,
      })
    } else {
      gpsLog.updateMeta({
        n: updateCountRef.current,
        accuracy: nextPosition.accuracy,
        source,
        apiSource: apiSource ?? source,
        ageMs: nextPosition.ageMs,
        phase,
      })
    }

    gpsLog.accepted({
      ...nextPosition,
      apiSource: apiSource ?? source,
      phase,
    })
  }

  const showApproximateReading = useCallback((next) => {
    const message = getApproximateLocationMessage(next.accuracy)
    setApproximateMessage(message)
    setError(null)
    setErrorType('approximate')
    setIsLoading(false)
    setIsRefining(true)
    setGpsPhase('refining')
    setGpsStatusLabel('Esperando ubicación precisa…')
    patchGpsDiagnostics({
      approximateMessage: message,
      errorType: 'approximate',
      isLocationAccepted: false,
    })
  }, [])

  const recordDiscard = useCallback(
    (next, reason, meta = {}) => {
      discardCountRef.current += 1
      const payload = {
        reason,
        accuracy: next?.accuracy,
        ageMs: next?.ageMs,
        lat: next?.lat,
        lng: next?.lng,
        timestamp: next?.timestamp ?? Date.now(),
        ...meta,
      }
      setLastDiscarded(payload)
      setLastFixOutcome('discarded')

      if (reason === 'accuracy_too_poor') {
        showApproximateReading(next)
      }

      gpsLog.discarded({
        ...next,
        reason,
        apiSource: meta.apiSource,
        phase: meta.phase,
      })
      patchGpsDiagnostics({
        lastDiscarded: payload,
        lastFixOutcome: 'discarded',
        isLocationAccepted: false,
        lastRawReading: next ?? getGpsDiagnostics()?.lastRawReading ?? null,
        lastApiSource: meta.apiSource ?? getGpsDiagnostics()?.lastApiSource ?? null,
        discards: discardCountRef.current,
        isWatching: Boolean(stopRef.current),
        lastSavedPosition: null,
      })
    },
    [showApproximateReading],
  )

  const tryApplyFix = useCallback(
    (geoPosition, { phase, maximumAge, apiSource }) => {
      const next = normalizeGeoPosition(geoPosition, { phase })
      const source = estimateFixSource(geoPosition, { maximumAge })

      recordGpsUpdate(next, { apiSource })

      markAnyFixReceivedRef.current?.()

      if (DEBUG_GPS || import.meta.env.DEV) {
        gpsLog.rawReading({ ...next, apiSource, phase })
      }

      setLastRawReading(next)
      patchGpsDiagnostics({
        lastRawReading: next,
        lastApiSource: apiSource,
        lat: next.lat,
        lng: next.lng,
        accuracy: next.accuracy,
        altitudeAccuracy: next.altitudeAccuracy ?? null,
        speed: next.speed ?? null,
        heading: next.heading ?? null,
        isWatching: Boolean(stopRef.current),
        geolocationAvailable: GEOLOCATION_AVAILABLE,
      })

      if (isWithinSanFernandoArea(next.lat, next.lng)) {
        setPreviewPosition(next)
        patchGpsDiagnostics({ previewPosition: next, lastRawReading: next })
      }

      if (!isWithinSanFernandoArea(next.lat, next.lng)) {
        recordDiscard(next, 'outside_bounds', { source, phase, apiSource })
        return false
      }

      if (next.accuracy > GPS_ACCEPT_MAX_ACCURACY_M) {
        recordDiscard(next, 'accuracy_too_poor', { source, phase, apiSource })
        return false
      }

      const current = positionRef.current
      const rejectReason = rejectFixReason(current, next, { maximumAge })

      if (rejectReason) {
        recordDiscard(next, rejectReason, { source, phase, apiSource })
        return false
      }

      if (!shouldReplacePosition(current, next)) {
        recordDiscard(next, 'worse_or_redundant', { source, phase, apiSource })
        return false
      }

      if (current && isAbsurdJump(current, next)) {
        recordDiscard(next, 'absurd_jump', { source, phase, apiSource })
        return false
      }

      const isFirst = !hasAcceptedFixRef.current
      hasAcceptedFixRef.current = true

      applyPositionRef.current?.(next, {
        isFirstApply: isFirst,
        source,
        apiSource,
        phase: 'refined',
      })
      return true
    },
    [recordDiscard, recordGpsUpdate],
  )

  if (!throttledApplyRefinedRef.current) {
    throttledApplyRefinedRef.current = throttle((geoPosition) => {
      tryApplyFix(geoPosition, {
        phase: 'refined',
        maximumAge: geoOptionsRef.current.maximumAge,
        apiSource: 'watchPosition',
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
        apiSource: 'mock',
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
    setIsWatching(false)
    clearAcquisitionTimers()
    clearStallTimer()
    setIsGpsStalled(false)
    stallLoggedRef.current = false
  }, [clearAcquisitionTimers, clearStallTimer])

  const resetGpsSession = useCallback(() => {
    clearLastKnownPosition()
    clearAcquisitionTimers()
    hasAnyFixRef.current = false
    acquisitionGenerationRef.current += 1
    positionRef.current = null
    hasAcceptedFixRef.current = false
    setPosition(null)
    setPreviewPosition(null)
    setLastFixOutcome(null)
    setApproximateMessage(null)
    setError(null)
    setErrorType(null)
    setShowSoftWarning(false)
    setAcquisitionStatus('initializing')
    setAcquisitionMessage(GPS_ACQUISITION_LABEL.initializing)
    lastGpsUpdateAtRef.current = null
    lastValidFixAtRef.current = null
    stallLoggedRef.current = false
    setLastValidFixAt(null)
    setIsGpsStalled(false)
    clearStallTimer()
  }, [clearAcquisitionTimers, clearStallTimer])

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
        patchGpsDiagnostics({
          error: classified.message,
          errorType: 'denied',
          isWatching: Boolean(stopRef.current),
        })
        return
      }

      if (positionRef.current && isAcceptedPosition(positionRef.current)) {
        setIsRefining(true)
        setIsLoading(false)
        if (classified.type === 'timeout') {
          setError('No pudimos mejorar la señal GPS. Usamos tu última ubicación.')
          setErrorType('timeout')
        }
        patchGpsDiagnostics({
          error: classified.type === 'timeout' ? 'Timeout GPS' : classified.message,
          errorType: classified.type === 'timeout' ? 'timeout' : 'watch_error',
          isWatching: Boolean(stopRef.current),
        })
        syncDerivedState(positionRef.current, true)
        return
      }

      const elapsed = Date.now() - startTimeRef.current

      if (
        timeoutCountRef.current >= GPS_MAX_TIMEOUTS_BEFORE_WARN &&
        !hasAcceptedFixRef.current &&
        elapsed > GPS_HARD_ERROR_MS / 2
      ) {
        setShowSoftWarning(true)
        setGpsStatusLabel('Señal débil — seguimos buscando…')
        setGpsPhase('searching')
      }

      if (!hasAcceptedFixRef.current && elapsed >= GPS_HARD_ERROR_MS && !previewPosition && !hasAnyFixRef.current) {
        setError(
          classified.type === 'timeout'
            ? 'No pudimos obtener tu ubicación. Probá al aire libre.'
            : classified.message,
        )
        setErrorType(classified.type)
        setIsLoading(false)
        patchGpsDiagnostics({
          error: classified.message,
          errorType: classified.type === 'timeout' ? 'timeout' : 'watch_error',
          isWatching: Boolean(stopRef.current),
        })
      }
    },
    [previewPosition, syncDerivedState],
  )

  const ingestPosition = useCallback(
    (geoPosition, apiSource) => {
      const preview = normalizeGeoPosition(geoPosition, { phase: 'refined' })

      if (apiSource === 'watchPosition') {
        gpsLog.watchUpdate({
          lat: preview.lat,
          lng: preview.lng,
          accuracy: preview.accuracy,
          timestamp: preview.timestamp,
        })
      }

      const current = positionRef.current
      const shouldApplyImmediate =
        !current || preview.accuracy < (current.accuracy ?? Infinity) - 4

      if (shouldApplyImmediate) {
        tryApplyFix(geoPosition, {
          phase: 'refined',
          maximumAge: geoOptionsRef.current.maximumAge,
          apiSource,
        })
        return
      }

      throttledApplyRefinedRef.current(geoPosition)
    },
    [tryApplyFix],
  )

  const requestInitialFix = useCallback(
    (attempt, generation) => {
      if (generation !== acquisitionGenerationRef.current) return
      if (hasAnyFixRef.current) return

      gpsLog.requestingInitialFix({
        attempt,
        maxAttempts: GPS_INITIAL_FIX_MAX_ATTEMPTS,
      })

      setAcquisitionStatus(attempt === 1 ? 'initializing' : 'waiting')
      setAcquisitionMessage(
        attempt === 1
          ? GPS_ACQUISITION_LABEL.initializing
          : GPS_ACQUISITION_LABEL.waiting,
      )
      patchGpsDiagnostics({
        acquisitionStatus: attempt === 1 ? 'initializing' : 'waiting',
        acquisitionMessage:
          attempt === 1
            ? GPS_ACQUISITION_LABEL.initializing
            : GPS_ACQUISITION_LABEL.waiting,
        initialFixAttempt: attempt,
      })

      getCurrentPosition(geoOptionsRef.current)
        .then((geoPosition) => {
          if (generation !== acquisitionGenerationRef.current) return
          gpsLog.initialFixSuccess({
            attempt,
            accuracy: geoPosition.coords.accuracy,
            lat: geoPosition.coords.latitude,
            lng: geoPosition.coords.longitude,
          })
          ingestPosition(geoPosition, 'getCurrentPosition')
        })
        .catch((geoError) => {
          if (generation !== acquisitionGenerationRef.current) return
          gpsLog.initialFixTimeout({
            attempt,
            code: geoError?.code,
            message: geoError?.message,
          })
        })
    },
    [ingestPosition],
  )

  const startInitialAcquisition = useCallback(
    (generation) => {
      clearAcquisitionTimers()
      hasAnyFixRef.current = false
      setAcquisitionStatus('initializing')
      setAcquisitionMessage(GPS_ACQUISITION_LABEL.initializing)

      requestInitialFix(1, generation)

      for (let attempt = 2; attempt <= GPS_INITIAL_FIX_MAX_ATTEMPTS; attempt += 1) {
        const timer = setTimeout(() => {
          if (generation !== acquisitionGenerationRef.current) return
          if (hasAnyFixRef.current) return
          requestInitialFix(attempt, generation)
        }, GPS_INITIAL_FIX_RETRY_MS * (attempt - 1))
        initialRetryTimersRef.current.push(timer)
      }

      noFixTimerRef.current = setTimeout(() => {
        if (generation !== acquisitionGenerationRef.current) return
        if (hasAnyFixRef.current) return

        setAcquisitionStatus('no_response')
        setAcquisitionMessage(GPS_ACQUISITION_LABEL.no_response)
        setError(GPS_NO_FIX_MESSAGE)
        setErrorType('no_fix')
        setIsLoading(false)
        patchGpsDiagnostics({
          acquisitionStatus: 'no_response',
          acquisitionMessage: GPS_ACQUISITION_LABEL.no_response,
          error: GPS_NO_FIX_MESSAGE,
          errorType: 'no_fix',
        })
      }, GPS_NO_FIX_TIMEOUT_MS)
    },
    [clearAcquisitionTimers, requestInitialFix],
  )

  const startContinuousWatch = useCallback(() => {
    stopRef.current = watchPosition(
      (geoPosition) => ingestPosition(geoPosition, 'watchPosition'),
      handleWatchError,
      geoOptionsRef.current,
    )
    setIsWatching(true)
    patchGpsDiagnostics({ isWatching: true })
    scheduleStallCheck()
  }, [handleWatchError, ingestPosition, scheduleStallCheck])

  const startWatching = useCallback(() => {
    if (getQaState().forcePermissionDenied) {
      setError('Permiso de ubicación denegado (simulado).')
      setErrorType('denied')
      setIsLoading(false)
      return
    }

    if (!GEOLOCATION_AVAILABLE) {
      setError('Geolocalización no disponible en este dispositivo.')
      setErrorType('unavailable')
      setIsLoading(false)
      patchGpsDiagnostics({
        error: 'Geolocalización no disponible',
        errorType: 'unavailable',
        isWatching: false,
      })
      return
    }

    if (applyMockIfNeeded()) return

    stopWatching()
    const generation = acquisitionGenerationRef.current
    startTimeRef.current = Date.now()
    timeoutCountRef.current = 0
    setIsLoading(true)
    setGpsPhase('searching')
    setGpsStatusLabel('Buscando ubicación…')

    startInitialAcquisition(generation)
    startContinuousWatch()
  }, [
    applyMockIfNeeded,
    startContinuousWatch,
    startInitialAcquisition,
    stopWatching,
  ])

  const handlePermissionChangeRef = useRef(null)
  handlePermissionChangeRef.current = (event) => {
    setPermission(event.target.state)
    patchGpsDiagnostics({ permission: event.target.state })
  }

  const retryPreciseLocation = useCallback(async () => {
    resetGpsSession()
    stopWatching()

    if (navigator.permissions?.query) {
      try {
        permissionStatusRef.current?.removeEventListener?.(
          'change',
          handlePermissionChangeRef.current,
        )
        const status = await navigator.permissions.query({ name: 'geolocation' })
        permissionStatusRef.current = status
        setPermission(status.state)
        status.addEventListener('change', handlePermissionChangeRef.current)
        patchGpsDiagnostics({ permission: status.state })
      } catch {
        // Permissions API not fully supported
      }
    }

    startWatching()
  }, [resetGpsSession, startWatching, stopWatching])

  const requestSingleFix = useCallback(() => {
    if (!GEOLOCATION_AVAILABLE) {
      setError('Geolocalización no disponible en este dispositivo.')
      setErrorType('unavailable')
      patchGpsDiagnostics({ geolocationAvailable: false, errorType: 'unavailable' })
      return
    }

    setIsLoading(true)
    getCurrentPosition(geoOptionsRef.current)
      .then((geoPosition) => {
        ingestPosition(geoPosition, 'getCurrentPosition')
        setIsLoading(false)
      })
      .catch((geoError) => {
        handleWatchError(geoError)
      })
  }, [handleWatchError, ingestPosition])

  useGpsRecovery({ stopWatching, requestPermission: retryPreciseLocation })

  startWatchingRef.current = startWatching

  useEffect(() => {
    if (!position || !isRefining) return
    if (position.accuracy <= GPS_PROXIMITY_MAX_ACCURACY_M) {
      syncDerivedState(position, false)
    }
  }, [position, isRefining, syncDerivedState])

  useEffect(() => {
    patchGpsDiagnostics({
      isLoading,
      permission,
      isWatching,
      trustedPosition: position,
      lastSavedPosition: null,
      isLocationAccepted: lastFixOutcome === 'accepted',
      geolocationAvailable: GEOLOCATION_AVAILABLE,
      approximateMessage,
      acquisitionStatus,
      acquisitionMessage,
      lastValidFixAt,
      isGpsStalled,
      gpsStalledMessage: isGpsStalled ? GPS_STALLED_LABEL : null,
    })
  }, [
    isLoading,
    permission,
    isWatching,
    position,
    lastFixOutcome,
    approximateMessage,
    acquisitionStatus,
    acquisitionMessage,
    lastValidFixAt,
    isGpsStalled,
  ])

  useEffect(() => {
    clearLastKnownPosition()
    resetGpsSession()

    const queryPermission = async () => {
      patchGpsDiagnostics({
        geolocationAvailable: GEOLOCATION_AVAILABLE,
        permission: 'unknown',
        isLoading: true,
        isWatching: false,
        lastSavedPosition: null,
      })

      if (!navigator.permissions?.query) return

      try {
        permissionStatusRef.current?.removeEventListener?.(
          'change',
          handlePermissionChangeRef.current,
        )
        const status = await navigator.permissions.query({ name: 'geolocation' })
        permissionStatusRef.current = status
        setPermission(status.state)
        status.addEventListener('change', handlePermissionChangeRef.current)
        patchGpsDiagnostics({ permission: status.state })
      } catch {
        patchGpsDiagnostics({ permission: 'unknown' })
      }
    }

    queryPermission()
    startWatching()

    const unsubQa = subscribeQaState(() => {
      if (getQaState().mockPosition) applyMockIfNeeded()
      else if (getQaState().forcePermissionDenied) startWatchingRef.current?.()
    })

    return () => {
      unsubQa()
      cancelScheduled(throttledApplyRefinedRef.current)
      clearAcquisitionTimers()
      clearStallTimer()
      permissionStatusRef.current?.removeEventListener?.(
        'change',
        handlePermissionChangeRef.current,
      )
      stopWatching()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const mapPosition = position ?? previewPosition
  const proximityPosition = canUseProximity(position) ? position : null
  const hasUsablePosition = Boolean(proximityPosition)
  const showPreciseLocationHelp =
    permission === 'granted' &&
    !position &&
    (lastRawReading?.accuracy > GPS_ACCEPT_MAX_ACCURACY_M ||
      previewPosition?.accuracy > GPS_ACCEPT_MAX_ACCURACY_M)

  return {
    position: mapPosition,
    mapPosition,
    trustedPosition: position,
    previewPosition,
    lastRawReading,
    lastFixOutcome,
    proximityPosition,
    hasUsablePosition,
    canUseProximity: hasUsablePosition,
    error,
    errorType,
    approximateMessage,
    showPreciseLocationHelp,
    acquisitionStatus,
    acquisitionMessage,
    lastValidFixAt,
    isGpsStalled,
    gpsStalledMessage: isGpsStalled ? GPS_STALLED_LABEL : null,
    isLoading: isLoading && !hasAnyFixRef.current && !hasAcceptedFixRef.current,
    isRefining,
    isWatching,
    gpsPhase,
    gpsStatusLabel,
    accuracyTier,
    qualityState,
    showSoftWarning,
    permission,
    requestPermission: retryPreciseLocation,
    retryPreciseLocation,
    requestSingleFix,
    startTracking: startWatching,
    stopTracking: stopWatching,
    stopWatching,
    geolocationAvailable: GEOLOCATION_AVAILABLE,
    updateCount,
    timeToFirstFixMs,
    discardCount: discardCountRef.current,
    lastDiscarded,
  }
}
