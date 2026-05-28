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
        color: '#8cc63f',
        weight: 2.25,
        opacity: 0.52,
        dashArray: '7 12',
        lineCap: 'round',
        lineJoin: 'round',
        className: 'exploration-route-line',
        interactive: false,
      }).addTo(map)
    } else {
      lineRef.current.setLatLngs(latlngs)
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
