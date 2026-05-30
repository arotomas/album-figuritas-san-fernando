import { memo, useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

function RouteDestinationMarkerInner({ active, targetCoordinates }) {
  const map = useMap()
  const markerRef = useRef(null)

  useEffect(() => {
    const removeMarker = () => {
      markerRef.current?.remove()
      markerRef.current = null
    }

    if (!active || !targetCoordinates?.lat || !targetCoordinates?.lng) {
      removeMarker()
      return undefined
    }

    const html = `
      <div class="route-destination-marker flex flex-col items-center">
        <div class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-progress bg-zinc-950/95 shadow-[0_0_18px_rgba(140,198,63,0.42)]">
          <span class="text-base leading-none" aria-hidden="true">📍</span>
        </div>
        <div class="mt-0.5 h-2.5 w-2.5 rotate-45 border-r-2 border-b-2 border-progress bg-zinc-950/95"></div>
      </div>
    `

    const latLng = [targetCoordinates.lat, targetCoordinates.lng]

    if (!markerRef.current) {
      const icon = L.divIcon({
        className: 'leaflet-route-destination',
        html,
        iconSize: [36, 52],
        iconAnchor: [18, 50],
      })
      markerRef.current = L.marker(latLng, {
        icon,
        interactive: false,
        zIndexOffset: 850,
      }).addTo(map)
    } else {
      markerRef.current.setLatLng(latLng)
    }

    markerRef.current.setZIndexOffset(850)

    return removeMarker
  }, [active, map, targetCoordinates?.lat, targetCoordinates?.lng])

  return null
}

export const RouteDestinationMarker = memo(RouteDestinationMarkerInner)
