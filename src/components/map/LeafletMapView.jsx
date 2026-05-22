import { memo, useCallback, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { FaLocationCrosshairs } from 'react-icons/fa6'
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  TILE_ATTRIBUTION,
  TILE_OPTIONS,
  TILE_URL,
  USER_ZOOM,
} from '../../config/map'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useDebouncedLocation } from '../../hooks/useDebouncedLocation'
import { useFigureProximity } from '../../hooks/useFigureProximity'
import { VIBRATION_NEAR_COOLDOWN_MS } from '../../config/ux'
import { vibrateNearFigure } from '../../utils/vibration'
import { prefersReducedMotion } from '../../utils/performance'
import { FigureMarker } from './FigureMarker'
import { UserLocationDot } from './UserLocationDot'
import { NearFigureOverlay } from './NearFigureOverlay'
import { MapGpsStatus } from './MapGpsStatus'

import 'leaflet/dist/leaflet.css'

function MapResizeHandler() {
  const map = useMap()

  useEffect(() => {
    const invalidate = () => {
      requestAnimationFrame(() => map.invalidateSize({ animate: false }))
    }

    invalidate()
    const timer = setTimeout(invalidate, 120)

    window.visualViewport?.addEventListener('resize', invalidate)
    window.addEventListener('viewport-update', invalidate)
    window.addEventListener('orientationchange', invalidate)

    return () => {
      clearTimeout(timer)
      window.visualViewport?.removeEventListener('resize', invalidate)
      window.removeEventListener('viewport-update', invalidate)
      window.removeEventListener('orientationchange', invalidate)
    }
  }, [map])

  return null
}

function MapInstanceBridge({ mapRef }) {
  const map = useMap()

  useEffect(() => {
    mapRef.current = map
  }, [map, mapRef])

  return null
}

function MapFlyController({ position, zoom, reducedMotion }) {
  const map = useMap()
  const hasCenteredRef = useRef(false)
  const lastPosRef = useRef(null)

  useEffect(() => {
    if (!position) return

    const { lat, lng } = position
    const prev = lastPosRef.current

    if (
      prev &&
      Math.abs(prev.lat - lat) < 0.00001 &&
      Math.abs(prev.lng - lng) < 0.00001
    ) {
      return
    }

    lastPosRef.current = { lat, lng }

    if (!hasCenteredRef.current) {
      hasCenteredRef.current = true
      map.flyTo([lat, lng], zoom, {
        animate: !reducedMotion,
        duration: reducedMotion ? 0 : 1.1,
      })
    }
  }, [map, position, reducedMotion, zoom])

  return null
}

function UserLocationMarker({ position, isCoarse = false }) {
  const map = useMap()
  const markerRef = useRef(null)
  const rootRef = useRef(null)

  useEffect(() => {
    const el = document.createElement('div')
    rootRef.current = createRoot(el)

    const icon = L.divIcon({
      className: 'leaflet-user-marker',
      html: el,
      iconSize: [80, 80],
      iconAnchor: [40, 40],
    })

    const marker = L.marker([0, 0], { icon, interactive: false })
    marker.addTo(map)
    markerRef.current = marker

    return () => {
      rootRef.current?.unmount()
      marker.remove()
      markerRef.current = null
    }
  }, [map])

  useEffect(() => {
    if (!position || !markerRef.current || !rootRef.current) return

    markerRef.current.setLatLng([position.lat, position.lng])
    rootRef.current.render(
      <UserLocationDot accuracy={position.accuracy} isCoarse={isCoarse} />,
    )
  }, [position, isCoarse])

  return null
}

function FigureMarkersLayer({ figures, nearFigureIds }) {
  const map = useMap()
  const markersRef = useRef([])
  const rootsRef = useRef([])
  const cacheRef = useRef({})

  useEffect(() => {
    markersRef.current.forEach((marker) => marker.remove())
    rootsRef.current.forEach((root) => root.unmount())
    markersRef.current = []
    rootsRef.current = []
    cacheRef.current = {}

    figures.forEach((figure) => {
      const el = document.createElement('div')
      const root = createRoot(el)

      const icon = L.divIcon({
        className: 'leaflet-figure-marker',
        html: el,
        iconSize: [76, 110],
        iconAnchor: [38, 110],
      })

      const marker = L.marker([figure.lat, figure.lng], { icon })
      marker.addTo(map)

      rootsRef.current.push(root)
      markersRef.current.push(marker)
    })

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      rootsRef.current.forEach((root) => root.unmount())
      markersRef.current = []
      rootsRef.current = []
    }
  }, [figures, map])

  useEffect(() => {
    figures.forEach((figure, index) => {
      const root = rootsRef.current[index]
      if (!root) return

      const isNear = nearFigureIds.has(figure.id)
      const cacheKey = `${figure.id}-${figure.obtenida}-${isNear}`

      if (cacheRef.current[figure.id] === cacheKey) return
      cacheRef.current[figure.id] = cacheKey

      root.render(
        <FigureMarker figure={figure} isNear={isNear} isPulsing={isNear} />,
      )
    })
  }, [figures, nearFigureIds])

  return null
}

function LeafletMapViewInner({
  figures,
  className = '',
  onNearFigureChange,
  onOpenCamera,
}) {
  const mapRef = useRef(null)
  const {
    position,
    proximityPosition,
    hasUsablePosition,
    error,
    errorType,
    isLoading,
    gpsPhase,
    gpsStatusLabel,
    qualityState,
    showSoftWarning,
    requestPermission,
  } = useGeolocation()

  const debouncedProximity = useDebouncedLocation(proximityPosition, 900)
  const { nearFigure, isNearFigure, nearFigures } = useFigureProximity(
    debouncedProximity,
    figures,
  )

  const nearFigureIdsRef = useRef(new Set())
  nearFigureIdsRef.current = new Set(nearFigures.map((f) => f.id))

  const lastVibratedFigureIdRef = useRef(null)
  const reducedMotion = prefersReducedMotion()

  const handleOpenCamera = useCallback(() => {
    onOpenCamera?.()
  }, [onOpenCamera])

  const handleRecenter = useCallback(() => {
    if (!mapRef.current || !position) return

    mapRef.current.flyTo([position.lat, position.lng], USER_ZOOM, {
      animate: !reducedMotion,
      duration: reducedMotion ? 0 : 0.7,
    })
  }, [position, reducedMotion])

  useEffect(() => {
    onNearFigureChange?.(nearFigure ?? null)

    if (nearFigure) {
      if (lastVibratedFigureIdRef.current !== nearFigure.id) {
        if (vibrateNearFigure(VIBRATION_NEAR_COOLDOWN_MS)) {
          lastVibratedFigureIdRef.current = nearFigure.id
        }
      }
    } else {
      lastVibratedFigureIdRef.current = null
    }
  }, [nearFigure, onNearFigureChange])

  const showGpsBanner =
    !error &&
    !position &&
    (gpsPhase === 'searching' || isLoading || showSoftWarning)

  const showRefiningBanner =
    !error &&
    position &&
    (gpsPhase === 'refining' ||
      qualityState === 'refining' ||
      showSoftWarning)

  const gpsBannerLabel = showSoftWarning
    ? 'Señal débil — seguimos buscando…'
    : position?.accuracy
      ? `${gpsStatusLabel} (~${Math.round(position.accuracy)}m)`
      : gpsStatusLabel

  const showHardError = error && errorType === 'denied'

  return (
    <div className={`relative h-full min-h-0 overflow-hidden ${className}`}>
      <div className="map-container gpu-layer absolute inset-0 h-full w-full">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          zoomControl={false}
          attributionControl
          className="!h-full !w-full"
          preferCanvas
        >
          <TileLayer
            url={TILE_URL}
            attribution={TILE_ATTRIBUTION}
            {...TILE_OPTIONS}
          />
          <MapInstanceBridge mapRef={mapRef} />
          <MapResizeHandler />
          <MapFlyController
            position={position}
            zoom={USER_ZOOM}
            reducedMotion={reducedMotion}
          />
          <FigureMarkersLayer
            figures={figures}
            nearFigureIds={nearFigureIdsRef.current}
          />
          {position && (
            <UserLocationMarker
              position={position}
              isCoarse={!hasUsablePosition}
            />
          )}
        </MapContainer>

        <div className="map-vignette pointer-events-none absolute inset-0 z-[400]" aria-hidden />
      </div>

      {showGpsBanner && (
        <MapGpsStatus
          label={gpsBannerLabel}
          phase={showSoftWarning ? 'warn' : 'searching'}
        />
      )}

      {showRefiningBanner && (
        <MapGpsStatus
          label={gpsBannerLabel}
          phase={showSoftWarning ? 'warn' : 'refining'}
        />
      )}

      {showHardError && (
        <div className="safe-top absolute inset-x-4 top-16 z-[500] rounded-xl bg-red-950/90 px-4 py-3 text-center">
          <p className="text-sm text-red-200">{error}</p>
          <p className="mt-1 text-xs text-red-300/80">
            Habilitalo en ajustes del navegador si lo rechazaste antes.
          </p>
          <button
            type="button"
            onClick={requestPermission}
            className="mt-2 min-h-[44px] text-xs font-bold uppercase text-white underline"
          >
            Reintentar ubicación
          </button>
        </div>
      )}

      {error && !showHardError && (
        <div className="safe-top absolute inset-x-4 top-16 z-[500]">
          <MapGpsStatus label={error} phase="warn" />
          <button
            type="button"
            onClick={requestPermission}
            className="pointer-events-auto mx-auto mt-2 block text-xs font-medium text-white/70 underline"
          >
            Reintentar ubicación
          </button>
        </div>
      )}

      {position && (
        <button
          type="button"
          onClick={handleRecenter}
          className="gpu-layer absolute right-4 top-4 z-[500] flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-zinc-900/90 text-white shadow-md active:scale-95"
          aria-label="Centrar en mi ubicación"
        >
          <FaLocationCrosshairs size={18} />
        </button>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500]">
        {isNearFigure && (
          <NearFigureOverlay
            nearFigure={nearFigure}
            onOpenCamera={handleOpenCamera}
          />
        )}
      </div>
    </div>
  )
}

export const LeafletMapView = memo(LeafletMapViewInner)
