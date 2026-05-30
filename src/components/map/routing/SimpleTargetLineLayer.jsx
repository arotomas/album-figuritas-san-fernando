import { memo, useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { EXPLORATION_LINE_UPDATE_MIN_M } from '../../../config/exploration'
import { SIMPLE_ROUTING_EXPERIMENT } from '../../../config/simpleRoutingExperiment'
import { getDistanceMeters } from '../../../utils/geo'

const SIMPLE_ROUTE_PANE = 'simpleRoutePane'

function ensureSimpleRoutePane(map) {
  if (map.getPane(SIMPLE_ROUTE_PANE)) return SIMPLE_ROUTE_PANE

  const pane = map.createPane(SIMPLE_ROUTE_PANE)
  pane.style.zIndex = '515'
  return SIMPLE_ROUTE_PANE
}

function SimpleTargetLineLayerInner({ active, userPosition, targetCoordinates }) {
  const map = useMap()
  const lineRef = useRef(null)
  const lastLineRef = useRef(null)
  const lineStyle = SIMPLE_ROUTING_EXPERIMENT.line

  useEffect(() => {
    const removeLine = () => {
      if (!lineRef.current) return
      map.removeLayer(lineRef.current)
      lineRef.current = null
      lastLineRef.current = null
    }

    if (
      !active ||
      !userPosition?.lat ||
      !userPosition?.lng ||
      !targetCoordinates?.lat ||
      !targetCoordinates?.lng
    ) {
      removeLine()
      return undefined
    }

    const latlngs = [
      [userPosition.lat, userPosition.lng],
      [targetCoordinates.lat, targetCoordinates.lng],
    ]

    const last = lastLineRef.current
    if (last) {
      const movedUser = getDistanceMeters(
        last.user.lat,
        last.user.lng,
        userPosition.lat,
        userPosition.lng,
      )
      const movedTarget = getDistanceMeters(
        last.target.lat,
        last.target.lng,
        targetCoordinates.lat,
        targetCoordinates.lng,
      )
      if (
        movedUser != null &&
        movedUser < EXPLORATION_LINE_UPDATE_MIN_M &&
        movedTarget != null &&
        movedTarget < EXPLORATION_LINE_UPDATE_MIN_M
      ) {
        return undefined
      }
    }

    const pane = ensureSimpleRoutePane(map)

    if (!lineRef.current) {
      lineRef.current = L.polyline(latlngs, {
        color: lineStyle.color,
        weight: lineStyle.weight,
        opacity: lineStyle.opacity,
        dashArray: lineStyle.dashArray ?? undefined,
        lineCap: 'round',
        lineJoin: 'round',
        className: 'simple-route-line',
        interactive: false,
        pane,
      }).addTo(map)
    } else {
      lineRef.current.setLatLngs(latlngs)
    }

    lastLineRef.current = {
      user: { lat: userPosition.lat, lng: userPosition.lng },
      target: { lat: targetCoordinates.lat, lng: targetCoordinates.lng },
    }

    return removeLine
  }, [
    active,
    lineStyle.color,
    lineStyle.dashArray,
    lineStyle.opacity,
    lineStyle.weight,
    map,
    targetCoordinates?.lat,
    targetCoordinates?.lng,
    userPosition?.lat,
    userPosition?.lng,
  ])

  return null
}

export const SimpleTargetLineLayer = memo(SimpleTargetLineLayerInner)
