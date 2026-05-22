import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { FaLocationCrosshairs } from 'react-icons/fa6'
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  isMapboxConfigured,
  MAPBOX_ACCESS_TOKEN,
  MAP_STYLE,
  USER_ZOOM,
} from '../../config/mapbox'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useDebouncedLocation } from '../../hooks/useDebouncedLocation'
import { useFigureProximity } from '../../hooks/useFigureProximity'
import { useOfflineStatus } from '../../hooks/useOfflineStatus'
import { VIBRATION_NEAR_COOLDOWN_MS } from '../../config/ux'
import { vibrateNearFigure } from '../../utils/vibration'
import { prefersReducedMotion } from '../../utils/performance'
import { FigureMarker } from './FigureMarker'
import { UserLocationDot } from './UserLocationDot'
import { NearFigureOverlay } from './NearFigureOverlay'

function MapViewInner({
  figures,
  className = '',
  onNearFigureChange,
  onOpenCamera,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const mapboxRef = useRef(null)
  const userMarkerRef = useRef(null)
  const userRootRef = useRef(null)
  const figureMarkersRef = useRef([])
  const figureRootsRef = useRef([])
  const markerNearStateRef = useRef({})
  const hasCenteredRef = useRef(false)
  const lastVibratedFigureIdRef = useRef(null)
  const lastUserPosRef = useRef(null)

  const { position, error, errorType, isLoading, requestPermission } = useGeolocation()
  const { isOffline } = useOfflineStatus()
  const debouncedPosition = useDebouncedLocation(position, 900)
  const { nearFigure, isNearFigure, figuresWithDistance, nearFigures } = useFigureProximity(
    debouncedPosition,
    figures,
  )

  const nearFigureIds = useRef(new Set())
  nearFigureIds.current = new Set(nearFigures.map((f) => f.id))

  const [mapReady, setMapReady] = useState(false)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const reducedMotion = prefersReducedMotion()

  const handleRecenter = useCallback(() => {
    if (!mapRef.current || !position) return

    mapRef.current.flyTo({
      center: [position.lng, position.lat],
      zoom: USER_ZOOM,
      duration: reducedMotion ? 0 : 700,
      essential: true,
    })
  }, [position, reducedMotion])

  const handleOpenCamera = useCallback(() => {
    onOpenCamera?.()
  }, [onOpenCamera])

  // Dynamic Mapbox import — chunk separado
  useEffect(() => {
    if (!isMapboxConfigured() || !mapContainerRef.current || mapRef.current) {
      return
    }

    let cancelled = false

    async function initMap() {
      const [mapboxModule] = await Promise.all([
        import('mapbox-gl'),
        import('mapbox-gl/dist/mapbox-gl.css'),
      ])

      if (cancelled || !mapContainerRef.current) return

      const mapboxgl = mapboxModule.default
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN
      mapboxRef.current = mapboxgl

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        pitch: reducedMotion ? 0 : 45,
        bearing: reducedMotion ? 0 : -12,
        antialias: !reducedMotion,
        attributionControl: false,
        fadeDuration: reducedMotion ? 0 : 300,
      })

      map.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        'bottom-left',
      )

      map.on('load', () => {
        if (!cancelled) setIsMapLoaded(true)
      })

      mapRef.current = map
      setMapReady(true)
    }

    initMap()

    return () => {
      cancelled = true
      figureRootsRef.current.forEach((root) => root.unmount())
      figureRootsRef.current = []
      figureMarkersRef.current.forEach((marker) => marker.remove())
      figureMarkersRef.current = []

      userRootRef.current?.unmount()
      userRootRef.current = null
      userMarkerRef.current?.remove()
      userMarkerRef.current = null

      mapRef.current?.remove()
      mapRef.current = null
      mapboxRef.current = null
      setMapReady(false)
      setIsMapLoaded(false)
      hasCenteredRef.current = false
    }
  }, [reducedMotion])

  // User marker — throttled position updates
  useEffect(() => {
    if (!mapRef.current || !position || !isMapLoaded || !mapboxRef.current) return

    const { lng, lat, accuracy } = position
    const prev = lastUserPosRef.current

    if (
      prev &&
      Math.abs(prev.lat - lat) < 0.00001 &&
      Math.abs(prev.lng - lng) < 0.00001
    ) {
      return
    }

    lastUserPosRef.current = { lat, lng }

    if (!userMarkerRef.current) {
      const el = document.createElement('div')
      userRootRef.current = createRoot(el)
      userMarkerRef.current = new mapboxRef.current.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([lng, lat])
        .addTo(mapRef.current)
    } else {
      userMarkerRef.current.setLngLat([lng, lat])
    }

    userRootRef.current.render(<UserLocationDot accuracy={accuracy} />)

    if (!hasCenteredRef.current) {
      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: USER_ZOOM,
        duration: reducedMotion ? 0 : 1200,
        essential: true,
      })
      hasCenteredRef.current = true
    }
  }, [position, isMapLoaded, reducedMotion])

  // Create figure markers once
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded || !mapboxRef.current || !figures.length) {
      return
    }

    figureRootsRef.current.forEach((root) => root.unmount())
    figureMarkersRef.current.forEach((marker) => marker.remove())
    figureRootsRef.current = []
    figureMarkersRef.current = []
    markerNearStateRef.current = {}

    figures.forEach((figure) => {
      const el = document.createElement('div')
      const root = createRoot(el)
      const marker = new mapboxRef.current.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([figure.lng, figure.lat])
        .addTo(mapRef.current)

      figureRootsRef.current.push(root)
      figureMarkersRef.current.push(marker)
    })
  }, [figures, isMapLoaded])

  // Update markers only when near-state changes
  useEffect(() => {
    figures.forEach((figure, index) => {
      const root = figureRootsRef.current[index]
      if (!root) return

      const isNear = nearFigureIds.current.has(figure.id)

      const cacheKey = `${figure.id}-${figure.obtenida}-${isNear}`
      if (markerNearStateRef.current[figure.id] === cacheKey) return

      markerNearStateRef.current[figure.id] = cacheKey

      root.render(
        <FigureMarker
          figure={figure}
          isNear={isNear}
          isPulsing={isNear}
        />,
      )
    })
  }, [figures, nearFigures])

  // Proximity vibration + callback (debounced via debouncedPosition)
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

  if (!isMapboxConfigured()) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-zinc-900 px-8 text-center ${className}`}
      >
        <p className="text-lg font-bold text-white">Mapbox no configurado</p>
        <p className="mt-3 text-sm text-zinc-400">
          Agregá tu token en .env como VITE_MAPBOX_ACCESS_TOKEN
        </p>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={mapContainerRef} className="map-container gpu-layer absolute inset-0" />

      {(isLoading || !mapReady) && !error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-900/90">
          <p className="map-skeleton-pulse text-sm font-medium text-white">
            {isOffline ? 'Cargando mapa (sin conexión puede tardar)…' : 'Obteniendo tu ubicación…'}
          </p>
        </div>
      )}

      {error && (
        <div className="absolute inset-x-4 top-4 z-20 rounded-xl bg-red-950/90 px-4 py-3 text-center safe-top">
          <p className="text-sm text-red-200">{error}</p>
          {errorType === 'denied' && (
            <p className="mt-1 text-xs text-red-300/80">
              Habilitalo en ajustes del navegador si lo rechazaste antes.
            </p>
          )}
          <button
            type="button"
            onClick={requestPermission}
            className="mt-2 min-h-[44px] text-xs font-bold uppercase text-white underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {position && (
        <button
          type="button"
          onClick={handleRecenter}
          className="gpu-layer absolute right-4 top-4 z-20 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-zinc-900/90 text-white shadow-md active:scale-95"
          aria-label="Centrar en mi ubicación"
        >
          <FaLocationCrosshairs size={18} />
        </button>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
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

export const MapView = memo(MapViewInner)
