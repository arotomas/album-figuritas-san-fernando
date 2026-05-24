import { memo, useMemo } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  TILE_ATTRIBUTION,
  TILE_OPTIONS,
  TILE_URL,
} from '../../config/map'

import 'leaflet/dist/leaflet.css'

export function AdminPlayerLocationMap({
  lat,
  lng,
  label = 'Domicilio aproximado',
  className = 'h-56',
}) {
  if (lat == null || lng == null) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-dashed border-border bg-slate-50 text-sm text-muted ${className}`}
      >
        Sin ubicación registrada
      </div>
    )
  }

  const position = [Number(lat), Number(lng)]

  return (
    <div className={`overflow-hidden rounded-2xl border border-border bg-white ${className}`}>
      <MapContainer center={position} zoom={DEFAULT_ZOOM} className="h-full w-full" scrollWheelZoom>
        <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} {...TILE_OPTIONS} />
        <CircleMarker
          center={position}
          radius={10}
          pathOptions={{
            color: '#2563eb',
            fillColor: '#93c5fd',
            fillOpacity: 0.95,
            weight: 2,
          }}
        >
          <Popup>
            <strong>{label}</strong>
            <br />
            {position[0].toFixed(5)}, {position[1].toFixed(5)}
          </Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  )
}

function DistributionMapInner({ players, className }) {
  const markers = useMemo(
    () =>
      (players ?? []).filter(
        (player) => player.direccion_lat != null && player.direccion_lng != null,
      ),
    [players],
  )

  const center = useMemo(() => {
    if (markers.length === 1) {
      return [Number(markers[0].direccion_lat), Number(markers[0].direccion_lng)]
    }
    return DEFAULT_CENTER
  }, [markers])

  if (!markers.length) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-dashed border-border bg-slate-50 text-sm text-muted ${className}`}
      >
        Todavía no hay domicilios geolocalizados.
      </div>
    )
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-border bg-white ${className}`}>
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM - 1}
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} {...TILE_OPTIONS} />
        {markers.map((player) => (
          <CircleMarker
            key={player.id}
            center={[Number(player.direccion_lat), Number(player.direccion_lng)]}
            radius={8}
            pathOptions={{
              color: '#2563eb',
              fillColor: '#60a5fa',
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <strong>{player.username ?? 'Jugador'}</strong>
              <br />
              {player.localidad ?? player.direccion_texto ?? 'Sin dirección'}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}

export const AdminPlayersDistributionMap = memo(DistributionMapInner)
