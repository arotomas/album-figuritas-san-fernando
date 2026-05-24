import { useEffect, useMemo, useRef, useState } from 'react'
import { getDistanceMeters } from '../utils/geo'
import {
  buildProximitySnapshot,
  compareFigureProximityPriority,
  getProximityRadii,
  pickPriorityFigure,
} from '../utils/proximityExperience'

/**
 * Proximidad con histéresis por figurita:
 * - detección: avisa dentro del radio de detección (por rareza)
 * - captura: solo dentro del radio de captura (otro hook/flujo)
 */
export function useFigureProximity(userPosition, figures) {
  const nearStateRef = useRef({})
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
        isNearFigure: false,
        nearFigure: null,
        nearFigures: [],
        priorityNearFigure: null,
      }
    }

    const nearFigures = figuresWithDistance.filter(
      (figure) => nearStateRef.current[figure.id],
    )

    const priorityNearFigure = pickPriorityFigure(nearFigures)
    const nearestFigure = figuresWithDistance[0] ?? null

    return {
      figuresWithDistance,
      nearestFigure,
      nearestDistance: nearestFigure?.distanceMeters ?? null,
      isNearFigure: nearFigures.length > 0,
      nearFigure: priorityNearFigure,
      nearFigures,
      priorityNearFigure,
    }
  }, [figures, figuresWithDistance, tick, userPosition])
}
