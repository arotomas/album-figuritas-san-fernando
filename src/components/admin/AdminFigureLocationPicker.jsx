import { useEffect, useMemo, useState } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  TILE_ATTRIBUTION,
  TILE_OPTIONS,
  TILE_URL,
} from '../../config/map'

import 'leaflet/dist/leaflet.css'

const markerIcon = L.divIcon({
  className: 'admin-figure-location-marker',
  html: '<div style="width:20px;height:20px;border-radius:999px;background:#f97316;border:3px solid white;box-shadow:0 8px 18px rgba(15,23,42,.35)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function LocationEvents({ onSelect, onCenterChange }) {
  const map = useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng)
    },
    moveend() {
      const center = map.getCenter()
      onCenterChange(center.lat, center.lng)
    },
  })

  useEffect(() => {
    const center = map.getCenter()
    onCenterChange(center.lat, center.lng)
  }, [map, onCenterChange])

  return null
}

function MapRecenter({ lat, lng }) {
  const map = useMap()

  useEffect(() => {
    if (lat == null || lng == null) return
    map.setView([Number(lat), Number(lng)], Math.max(map.getZoom(), DEFAULT_ZOOM), {
      animate: false,
    })
  }, [lat, lng, map])

  return null
}

export function AdminFigureLocationPicker({ lat, lng, radius, onChange }) {
  const [center, setCenter] = useState(null)
  const [geoStatus, setGeoStatus] = useState('')
  const selectedPosition = useMemo(
    () => (lat != null && lng != null && lat !== '' && lng !== '' ? [Number(lat), Number(lng)] : null),
    [lat, lng],
  )

  const handleSelect = (nextLat, nextLng) => {
    console.info('[admin-figures]', 'location selected', { lat: nextLat, lng: nextLng })
    onChange({ lat: nextLat, lng: nextLng })
  }

  const useMapCenter = () => {
    if (!center) return
    handleSelect(center.lat, center.lng)
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Geolocalización no disponible en este navegador.')
      return
    }

    setGeoStatus('Buscando ubicación…')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoStatus('Ubicación cargada.')
        handleSelect(position.coords.latitude, position.coords.longitude)
      },
      () => {
        setGeoStatus('No pudimos obtener tu ubicación actual.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink">Selector de ubicación</p>
          <p className="text-xs text-muted">
            Click en el mapa o arrastrá el marcador para ajustar el punto.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={useMapCenter}
            className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-bold"
          >
            Usar centro del mapa
          </button>
          <button
            type="button"
            onClick={useCurrentLocation}
            className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white"
          >
            Usar mi ubicación actual
          </button>
        </div>
      </div>

      {geoStatus && <p className="text-xs text-muted">{geoStatus}</p>}

      <div className="h-[460px] overflow-hidden rounded-2xl border border-border">
        <MapContainer
          center={selectedPosition ?? DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} {...TILE_OPTIONS} />
          <LocationEvents
            onSelect={handleSelect}
            onCenterChange={(nextLat, nextLng) => setCenter({ lat: nextLat, lng: nextLng })}
          />
          <MapRecenter lat={lat} lng={lng} />

          {selectedPosition && (
            <>
              <Marker
                position={selectedPosition}
                icon={markerIcon}
                draggable
                eventHandlers={{
                  dragend(event) {
                    const next = event.target.getLatLng()
                    handleSelect(next.lat, next.lng)
                  },
                }}
              >
                <Popup>Ubicación de la figurita</Popup>
              </Marker>
              <Circle
                center={selectedPosition}
                radius={Number(radius) || 250}
                pathOptions={{ color: '#f97316', fillColor: '#fed7aa', fillOpacity: 0.18 }}
              />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  )
}
