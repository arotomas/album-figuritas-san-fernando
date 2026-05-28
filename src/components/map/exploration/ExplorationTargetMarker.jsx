import { memo, useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

function ExplorationTargetMarkerInner({ active, targetCoordinates, targetName }) {
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
      <div class="exploration-target-marker flex flex-col items-center">
        <div class="rounded-xl border-2 border-progress/80 bg-zinc-950/92 px-2 py-1 shadow-[0_0_20px_rgba(140,198,63,0.35)]">
          <span class="block text-[9px] font-bold uppercase tracking-wide text-progress">Objetivo</span>
        </div>
        <div class="mt-1 h-3 w-3 rotate-45 border-2 border-progress bg-zinc-950/95"></div>
      </div>
    `

    if (!markerRef.current) {
      const icon = L.divIcon({
        className: 'leaflet-exploration-target',
        html,
        iconSize: [88, 56],
        iconAnchor: [44, 52],
      })
      markerRef.current = L.marker(
        [targetCoordinates.lat, targetCoordinates.lng],
        { icon, interactive: false, zIndexOffset: 800 },
      ).addTo(map)
    } else {
      markerRef.current.setLatLng([targetCoordinates.lat, targetCoordinates.lng])
    }

    markerRef.current.setZIndexOffset(800)

    return removeMarker
  }, [active, map, targetCoordinates?.lat, targetCoordinates?.lng, targetName])

  return null
}

export const ExplorationTargetMarker = memo(ExplorationTargetMarkerInner)
