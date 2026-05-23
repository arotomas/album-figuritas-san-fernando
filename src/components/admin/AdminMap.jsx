import { useMemo } from 'react'
import L from 'leaflet'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  TILE_ATTRIBUTION,
  TILE_OPTIONS,
  TILE_URL,
} from '../../config/map'

import 'leaflet/dist/leaflet.css'

function toLatLng(row) {
  if (row?.lat == null || row?.lng == null) return null
  return [Number(row.lat), Number(row.lng)]
}

function createFigureIcon(figure) {
  const size = Number(figure.marker_icon_size) || 48
  return L.icon({
    iconUrl: figure.marker_icon_url,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  })
}

export function AdminMap({ figures, captures, className = 'h-[620px]' }) {
  const figureMarkers = useMemo(
    () => (figures ?? []).map((figure) => ({ ...figure, latlng: toLatLng(figure) })).filter((m) => m.latlng),
    [figures],
  )
  const captureMarkers = useMemo(
    () => (captures ?? []).map((capture) => ({ ...capture, latlng: toLatLng(capture) })).filter((m) => m.latlng),
    [captures],
  )

  return (
    <div className={`${className} overflow-hidden rounded-2xl border border-border bg-white shadow-sm`}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution={TILE_ATTRIBUTION}
          url={TILE_URL}
          {...TILE_OPTIONS}
        />

        {figureMarkers.map((figure) =>
          figure.marker_icon_url ? (
            <Marker
              key={`figure-${figure.id}`}
              position={figure.latlng}
              icon={createFigureIcon(figure)}
            >
              <Popup>
                <strong>{figure.title}</strong>
                <br />
                {figure.rarity} · {figure.active ? 'activa' : 'inactiva'}
              </Popup>
            </Marker>
          ) : (
            <CircleMarker
              key={`figure-${figure.id}`}
              center={figure.latlng}
              radius={8}
              pathOptions={{
                color: figure.active ? '#16a34a' : '#94a3b8',
                fillColor: figure.active ? '#86efac' : '#cbd5e1',
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <strong>{figure.title}</strong>
                <br />
                {figure.rarity} · {figure.active ? 'activa' : 'inactiva'}
              </Popup>
            </CircleMarker>
          ),
        )}

        {captureMarkers.map((capture) => (
          <CircleMarker
            key={`capture-${capture.id}`}
            center={capture.latlng}
            radius={5}
            pathOptions={{
              color: '#2563eb',
              fillColor: '#60a5fa',
              fillOpacity: 0.85,
            }}
          >
            <Popup>
              <strong>{capture.username}</strong>
              <br />
              {capture.figureTitle}
              <br />
              {new Date(capture.created_at).toLocaleString('es-AR')}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
