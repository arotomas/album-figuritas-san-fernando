import { useEffect, useMemo, useRef } from 'react'
import { getDistanceMeters } from '../utils/geo'
import {
  GLOBAL_DISCOVERY_COOLDOWN_MS,
  LAUNCH_DISCOVERY_ENABLED,
  LAUNCH_DISCOVERY_EXIT_M,
  LAUNCH_DISCOVERY_GPS_DEBOUNCE_MS,
  LAUNCH_DISCOVERY_RADIUS_M,
} from '../config/launchDiscovery'
import { getLaunchDiscoveryFigures } from '../utils/launchDiscoveryFigures'
import { useDebouncedLocation } from './useDebouncedLocation'
import { useAppGeolocation } from './useAppGeolocation'
import { useAppStore } from '../store/useAppStore'
import { useLaunchDiscoveryStore } from '../store/launchDiscoveryStore'
import {
  hasLaunchDiscoveryAlerted,
  markLaunchDiscoveryAlerted,
} from '../utils/launchDiscoverySession'
import { playGameSound } from '../services/audio'
import { vibrateLaunchDiscovery } from '../utils/vibration'

function sortByDistance(a, b) {
  return (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity)
}

/**
 * Descubrimiento pasivo en foreground (cualquier pestaña bajo AppLayout).
 * Una alerta por figurita por sesión; cola global con cooldown de 10 s.
 */
export function useLaunchProximityDiscovery({ enabled = LAUNCH_DISCOVERY_ENABLED } = {}) {
  const figures = useAppStore((state) => state.figures)
  const { proximityPosition } = useAppGeolocation()
  const debouncedPosition = useDebouncedLocation(
    proximityPosition,
    LAUNCH_DISCOVERY_GPS_DEBOUNCE_MS,
  )
  const showToast = useLaunchDiscoveryStore((state) => state.showToast)

  const nearStateRef = useRef({})
  const queueRef = useRef([])
  const lastGlobalAlertAtRef = useRef(0)
  const dispatchTimerRef = useRef(null)

  const candidates = useMemo(
    () => getLaunchDiscoveryFigures(figures),
    [figures],
  )

  const figuresWithDistance = useMemo(() => {
    if (!debouncedPosition || !candidates.length) return []

    return candidates
      .map((figure) => ({
        ...figure,
        distanceMeters: getDistanceMeters(
          debouncedPosition.lat,
          debouncedPosition.lng,
          figure.lat,
          figure.lng,
        ),
      }))
      .sort(sortByDistance)
  }, [candidates, debouncedPosition])

  useEffect(() => {
    if (!enabled) return undefined

    return () => {
      if (dispatchTimerRef.current) {
        clearTimeout(dispatchTimerRef.current)
        dispatchTimerRef.current = null
      }
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled || !debouncedPosition) {
      nearStateRef.current = {}
      queueRef.current = []
      return
    }

    const enqueue = (figure) => {
      const key = String(figure.id)
      if (hasLaunchDiscoveryAlerted(key)) return
      if (queueRef.current.some((item) => String(item.id) === key)) return
      queueRef.current.push(figure)
      queueRef.current.sort(sortByDistance)
    }

    const dispatchNext = () => {
      dispatchTimerRef.current = null
      if (!queueRef.current.length) return

      const now = Date.now()
      const elapsed = now - lastGlobalAlertAtRef.current
      if (elapsed < GLOBAL_DISCOVERY_COOLDOWN_MS) {
        dispatchTimerRef.current = setTimeout(
          dispatchNext,
          GLOBAL_DISCOVERY_COOLDOWN_MS - elapsed,
        )
        return
      }

      const figure = queueRef.current.shift()
      if (!figure) return

      const figureKey = String(figure.id)
      markLaunchDiscoveryAlerted(figureKey)
      lastGlobalAlertAtRef.current = now

      vibrateLaunchDiscovery()
      playGameSound('NOTIFICACION_PUSH')
      showToast(figure)

      if (queueRef.current.length > 0) {
        dispatchTimerRef.current = setTimeout(dispatchNext, GLOBAL_DISCOVERY_COOLDOWN_MS)
      }
    }

    const scheduleDispatch = () => {
      if (dispatchTimerRef.current) return
      dispatchNext()
    }

    let enteredAny = false
    const nextNearState = { ...nearStateRef.current }

    figuresWithDistance.forEach((figure) => {
      const key = String(figure.id)
      const wasNear = Boolean(nextNearState[key])
      const dist = figure.distanceMeters

      if (!wasNear && dist <= LAUNCH_DISCOVERY_RADIUS_M) {
        nextNearState[key] = true
        enteredAny = true
        enqueue(figure)
      } else if (wasNear && dist > LAUNCH_DISCOVERY_EXIT_M) {
        delete nextNearState[key]
      }
    })

    nearStateRef.current = nextNearState

    if (enteredAny) {
      scheduleDispatch()
    }
  }, [debouncedPosition, enabled, figuresWithDistance, showToast])
}
