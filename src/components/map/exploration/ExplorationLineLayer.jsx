import { memo, useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

function ExplorationLineLayerInner({ active, userPosition, targetCoordinates }) {
  const map = useMap()
  const lineRef = useRef(null)

  useEffect(() => {
    const removeLine = () => {
      if (!lineRef.current) return
      map.removeLayer(lineRef.current)
      lineRef.current = null
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

    if (!lineRef.current) {
      lineRef.current = L.polyline(latlngs, {
        color: '#a3e635',
        weight: 4.5,
        opacity: 0.92,
        dashArray: '10 14',
        lineCap: 'round',
        lineJoin: 'round',
        className: 'exploration-route-line',
        interactive: false,
        pane: 'markerPane',
      }).addTo(map)
      lineRef.current.bringToFront()
    } else {
      lineRef.current.setLatLngs(latlngs)
      lineRef.current.bringToFront()
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
