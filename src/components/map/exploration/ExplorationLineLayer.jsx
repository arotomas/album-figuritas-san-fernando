import { memo, useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { EXPLORATION_LINE_UPDATE_MIN_M } from '../../../config/exploration'
import { getDistanceMeters } from '../../../utils/geo'

const EXPLORATION_ROUTE_PANE = 'explorationRoutePane'

function ensureExplorationRoutePane(map) {
  if (map.getPane(EXPLORATION_ROUTE_PANE)) return EXPLORATION_ROUTE_PANE

  const pane = map.createPane(EXPLORATION_ROUTE_PANE)
  pane.style.zIndex = '520'
  return EXPLORATION_ROUTE_PANE
}

function ExplorationLineLayerInner({ active, userPosition, targetCoordinates }) {
  const map = useMap()
  const lineRef = useRef(null)
  const lastLineRef = useRef(null)

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

    const pane = ensureExplorationRoutePane(map)

    if (!lineRef.current) {
      lineRef.current = L.polyline(latlngs, {
        color: '#a3e635',
        weight: 4.5,
        opacity: 0.92,
        dashArray: '10 14',
        lineCap: 'round',
        lineJoin: 'round',
        className: 'exploration-route-line exploration-route-line--static',
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
    map,
    targetCoordinates?.lat,
    targetCoordinates?.lng,
    userPosition?.lat,
    userPosition?.lng,
  ])

  return null
}

export const ExplorationLineLayer = memo(ExplorationLineLayerInner)
