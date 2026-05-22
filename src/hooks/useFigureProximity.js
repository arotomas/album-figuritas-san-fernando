import { useEffect, useMemo, useRef, useState } from 'react'
import { getDistanceMeters } from '../utils/geo'
import {
  PROXIMITY_ENTER_METERS,
  PROXIMITY_EXIT_METERS,
} from '../config/ux'

/**
 * Proximidad con histéresis: entra a 250m, sale a 280m — evita flicker en el borde.
 */
export function useFigureProximity(
  userPosition,
  figures,
  {
    enterMeters = PROXIMITY_ENTER_METERS,
    exitMeters = PROXIMITY_EXIT_METERS,
  } = {},
) {
  const nearStateRef = useRef({})
  const [tick, setTick] = useState(0)

  const figuresWithDistance = useMemo(() => {
    if (!userPosition || !figures.length) return []

    return figures
      .map((figure) => ({
        ...figure,
        distanceMeters: getDistanceMeters(
          userPosition.lat,
          userPosition.lng,
          figure.lat,
          figure.lng,
        ),
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
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

      const wasNear = Boolean(nextState[figure.id])
      const dist = figure.distanceMeters

      if (!wasNear && dist <= enterMeters) {
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
  }, [figuresWithDistance, userPosition, enterMeters, exitMeters])

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
      }
    }

    const nearFigures = figuresWithDistance.filter(
      (figure) => nearStateRef.current[figure.id],
    )

    const nearestFigure = figuresWithDistance[0] ?? null

    return {
      figuresWithDistance,
      nearestFigure,
      nearestDistance: nearestFigure?.distanceMeters ?? null,
      isNearFigure: nearFigures.length > 0,
      nearFigure: nearFigures[0] ?? null,
      nearFigures,
    }
  }, [figures, figuresWithDistance, tick, userPosition])
}
