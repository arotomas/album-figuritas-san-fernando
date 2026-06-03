import { useEffect, useMemo, useRef, useState } from 'react'
import { getDistanceMeters } from '../utils/geo'
import { MAP_CAPTURE_SWITCH_DELTA_M } from '../config/mapNavigation'
import {
  buildProximitySnapshot,
  compareFigureProximityPriority,
  getProximityRadii,
  pickNearestCapturableFigure,
  resolveMapCapturableFocus,
} from '../utils/proximityExperience'

/**
 * Proximidad con histéresis por figurita:
 * - detección: avisa dentro del radio de detección (por rareza)
 * - captura: solo dentro del radio de captura (otro hook/flujo)
 */
export function useFigureProximity(userPosition, figures, { activeTargetFigureId = null } = {}) {
  const nearStateRef = useRef({})
  const localFocusHoldRef = useRef(null)
  const [tick, setTick] = useState(0)

  const figuresWithDistance = useMemo(() => {
    if (!userPosition || !figures.length) return []

    return figures
      .map((figure) => {
        const distanceMeters = getDistanceMeters(
          userPosition.lat,
          userPosition.lng,
          figure.lat,
          figure.lng,
        )
        return {
          ...figure,
          distanceMeters,
          proximity: buildProximitySnapshot(figure, distanceMeters),
        }
      })
      .sort(compareFigureProximityPriority)
  }, [userPosition, figures])

  useEffect(() => {
    if (!userPosition) {
      nearStateRef.current = {}
      localFocusHoldRef.current = null
      setTick((v) => v + 1)
      return
    }

    let changed = false
    const nextState = { ...nearStateRef.current }

    figuresWithDistance.forEach((figure) => {
      if (figure.obtenida) {
        if (nextState[figure.id]) {
          delete nextState[figure.id]
          changed = true
        }
        return
      }

      const { detectionMeters, exitMeters } = getProximityRadii(figure)
      const wasNear = Boolean(nextState[figure.id])
      const dist = figure.distanceMeters

      if (!wasNear && dist <= detectionMeters) {
        nextState[figure.id] = true
        changed = true
      } else if (wasNear && dist > exitMeters) {
        delete nextState[figure.id]
        changed = true
      }
    })

    if (changed) {
      nearStateRef.current = nextState
      setTick((v) => v + 1)
    }
  }, [figuresWithDistance, userPosition])

  return useMemo(() => {
    void tick

    if (!userPosition || !figures.length) {
      return {
        figuresWithDistance: [],
        nearestFigure: null,
        nearestDistance: null,
        nearestCapturableFigure: null,
        isNearFigure: false,
        nearFigure: null,
        nearFigures: [],
        secondaryNearFigure: null,
        isFocusNear: false,
        activeTargetFigureId,
        localFocusOverride: false,
      }
    }

    const nearFigures = figuresWithDistance.filter(
      (figure) => nearStateRef.current[figure.id],
    )

    const nearestCapturableAmongNear = pickNearestCapturableFigure(nearFigures)
    const focus = resolveMapCapturableFocus({
      figuresWithDistance,
      nearFigures,
      activeTargetFigureId,
    })

    let focusFigure = focus.focusFigure
    const nearestCapturableFigure =
      nearestCapturableAmongNear ?? focus.nearestCapturableFigure ?? null

    if (
      focus.localFocusOverride &&
      focusFigure &&
      localFocusHoldRef.current &&
      String(localFocusHoldRef.current) !== String(focusFigure.id)
    ) {
      const held = nearFigures.find(
        (figure) => String(figure.id) === String(localFocusHoldRef.current),
      )
      const candidate = focusFigure
      if (
        held &&
        candidate?.distanceMeters != null &&
        held.distanceMeters - candidate.distanceMeters < MAP_CAPTURE_SWITCH_DELTA_M
      ) {
        focusFigure = held
      }
    }

    if (focusFigure?.id != null) {
      localFocusHoldRef.current = String(focusFigure.id)
    } else {
      localFocusHoldRef.current = null
    }

    const nearestByDistance = pickNearestCapturableFigure(figuresWithDistance)

    return {
      figuresWithDistance,
      nearestFigure: nearestByDistance,
      nearestDistance: nearestByDistance?.distanceMeters ?? null,
      nearestCapturableFigure,
      isNearFigure: nearFigures.length > 0,
      nearFigure: focusFigure,
      nearFigures,
      secondaryNearFigure: focus.secondaryNearFigure,
      isFocusNear: focus.isFocusNear,
      activeTargetStale: focus.activeTargetStale ?? false,
      activeTargetFigureId,
      localFocusOverride: focus.localFocusOverride ?? false,
    }
    // tick + debounced position
  }, [activeTargetFigureId, figures, figuresWithDistance, tick, userPosition])
}
