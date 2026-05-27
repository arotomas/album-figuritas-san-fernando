import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { GPS_PRECISE_LOCATION_HELP } from '../../config/gps'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useDebouncedLocation } from '../../hooks/useDebouncedLocation'
import { useThrottledMapCenter } from '../../hooks/useThrottledMapCenter'
import { useCinematicMapBearing } from '../../hooks/useCinematicMapBearing'
import { useSmoothedHeading } from '../../hooks/useSmoothedHeading'
import { MapInteractionBridge } from './MapInteractionBridge'
import { MapRotationController } from './MapRotationController'
import { useFigureProximity } from '../../hooks/useFigureProximity'
import { logGpsSnapshot } from '../../utils/universeDiagnostics'
import {
  FIGURE_ALERT_COOLDOWN_MS,
  MAP_FOLLOW_MIN_INTERVAL_MS,
  MAP_FOLLOW_MIN_MOVE_METERS,
  MAP_FOLLOW_MOVE_THRESHOLD,
  MAP_NEAR_SYNC_DISTANCE_BUCKET_M,
  MAP_PROXIMITY_DEBOUNCE_MS,
  TARGET_LOCK_FOCUS_NEAR_ENTER_MS,
  TARGET_LOCK_FOCUS_NEAR_HOLD_MS,
  TARGET_LOCK_SECONDARY_HINT_HOLD_MS,
} from '../../config/proximity'
import { vibrateFigureProximityAlert } from '../../utils/vibration'
import { prefersReducedMotion } from '../../utils/performance'
import { useStableBoolean } from '../../hooks/useStableBoolean'
import { FigureMarker } from './FigureMarker'
import { UserLocationDot } from './UserLocationDot'
import { NearFigureOverlay } from './NearFigureOverlay'
import { MapGpsStatus } from './MapGpsStatus'
import { GeoPolicyBanner } from './GeoPolicyBanner'
import { MapQaOverlay } from '../qa/MapQaOverlay'
import { findNearestPendingFigure } from '../../utils/gpsDiagnosticReport'
import { useAppStore } from '../../store/useAppStore'
import { ActiveTargetPill } from './ActiveTargetPill'
import { FigureTargetPrompt } from './FigureTargetPrompt'

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

function MapFlyController({
  position,
  zoom,
  reducedMotion,
  recenterTick = 0,
  missionFollow = false,
  followPaused = false,
}) {
  const map = useMap()
  const lastCenteredRef = useRef(null)
  const lastAccuracyRef = useRef(null)
  const prevRecenterTickRef = useRef(0)
  const panningRef = useRef(false)
  const moveThreshold = missionFollow ? MAP_FOLLOW_MOVE_THRESHOLD : 0.00004

  useEffect(() => {
    const onMoveEnd = () => {
      panningRef.current = false
    }
    map.on('moveend', onMoveEnd)
    return () => {
      map.off('moveend', onMoveEnd)
    }
  }, [map])

  useEffect(() => {
    if (!position) return

    const { lat, lng, accuracy } = position
    const prev = lastCenteredRef.current
    const isFirst = !prev
    const manualRecenter = recenterTick > prevRecenterTickRef.current

    if (manualRecenter) prevRecenterTickRef.current = recenterTick

    if (followPaused && !manualRecenter) return

    const moved =
      prev &&
      (Math.abs(prev.lat - lat) > moveThreshold ||
        Math.abs(prev.lng - lng) > moveThreshold)
    const accuracyImproved =
      accuracy != null &&
      lastAccuracyRef.current != null &&
      accuracy < lastAccuracyRef.current - 8

    if (!isFirst && !moved && !accuracyImproved && !manualRecenter) return

    if (panningRef.current && missionFollow && !manualRecenter && !isFirst) {
      return
    }

    lastCenteredRef.current = { lat, lng }
    if (accuracy != null) lastAccuracyRef.current = accuracy

    if (isFirst || manualRecenter) {
      panningRef.current = true
      map.flyTo([lat, lng], zoom, {
        animate: !reducedMotion,
        duration: reducedMotion ? 0 : 1.1,
      })
      return
    }

    panningRef.current = true
    map.panTo([lat, lng], {
      animate: !reducedMotion,
      duration: reducedMotion ? 0 : missionFollow ? 1.05 : 0.55,
    })
  }, [followPaused, map, missionFollow, moveThreshold, position, reducedMotion, zoom, recenterTick])

  return null
}

function UserLocationMarker({
  position,
  isCoarse = false,
  cinematicBearing = null,
  cinematicActive = false,
}) {
  const map = useMap()
  const markerRef = useRef(null)
  const rootRef = useRef(null)
  const renderKeyRef = useRef('')
  const smoothedCompassHeading = useSmoothedHeading(position)
  const compassHeading = cinematicActive ? null : smoothedCompassHeading

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
      renderKeyRef.current = ''
    }
  }, [map])

  useEffect(() => {
    if (!position?.lat || !position?.lng || !markerRef.current) return
    markerRef.current.setLatLng([position.lat, position.lng])
  }, [position?.lat, position?.lng])

  useEffect(() => {
    const root = rootRef.current
    if (!position || !root) return

    const accuracyBucket =
      position.accuracy != null ? Math.round(position.accuracy / 8) * 8 : 0
    const renderKey = `${accuracyBucket}:${isCoarse ? 1 : 0}:${cinematicActive ? `c${cinematicBearing ?? 'na'}` : (compassHeading ?? 'na')}`
    if (renderKeyRef.current === renderKey) return
    renderKeyRef.current = renderKey

    try {
      root.render(
        <UserLocationDot
          accuracy={position.accuracy}
          isCoarse={isCoarse}
          heading={compassHeading}
          lockHeadingUp={cinematicActive}
          counterBearing={cinematicActive ? cinematicBearing : null}
        />,
      )
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[map] user dot render skipped after unmount', error?.message)
      }
    }
  }, [cinematicActive, cinematicBearing, compassHeading, isCoarse, position, position?.accuracy])

  return null
}

function buildFiguresLayerSignature(figures) {
  return figures
    .map((figure) =>
      `${figure.id}:${figure.obtenida ? 1 : 0}:${figure.lat}:${figure.lng}`,
    )
    .join('|')
}

function FigureMarkersLayer({
  figures,
  figuresSignature,
  nearFigureIdsKey = '',
  activeTargetFigureId = null,
  onFigureClick,
}) {
  const map = useMap()
  const markersRef = useRef([])
  const rootsRef = useRef([])
  const cacheRef = useRef({})
  const onFigureClickRef = useRef(onFigureClick)
  onFigureClickRef.current = onFigureClick
  const nearIds = useMemo(
    () => new Set(nearFigureIdsKey.split(',').filter(Boolean)),
    [nearFigureIdsKey],
  )

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.info('[map-figures]', 'markers render', JSON.stringify({
        count: figures.length,
        ids: figures.map((figure) => String(figure.id)),
      }))
    }

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

      if (!figure.obtenida) {
        marker.on('click', (event) => {
          L.DomEvent.stopPropagation(event)
          onFigureClickRef.current?.(figure)
        })
      }

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
  }, [figures, figuresSignature, map])

  useEffect(() => {
    figures.forEach((figure, index) => {
      const root = rootsRef.current[index]
      if (!root) return

      const isActiveTarget =
        Boolean(activeTargetFigureId) &&
        String(figure.id) === String(activeTargetFigureId)
      const isDimmed = Boolean(activeTargetFigureId) && !isActiveTarget && !figure.obtenida
      const isNear = nearIds.has(String(figure.id)) || isActiveTarget
      const isPulsing = isNear && !isActiveTarget
      const cacheKey = `${figure.id}-${figure.obtenida}-${isNear}-${isActiveTarget}-${isDimmed}`

      if (cacheRef.current[figure.id] === cacheKey) return
      cacheRef.current[figure.id] = cacheKey

      root.render(
        <FigureMarker
          figure={figure}
          isNear={isNear}
          isPulsing={isPulsing}
          isActiveTarget={isActiveTarget}
          isDimmed={isDimmed}
        />,
      )
    })
  }, [activeTargetFigureId, figures, nearIds, nearFigureIdsKey])

  return null
}

function LeafletMapViewInner({
  figures,
  proximityFigures = figures,
  className = '',
  onNearFigureChange,
  onOpenCamera,
  onBonusDiscovered,
}) {
  const mapRef = useRef(null)
  const [mapInstanceKey] = useState(() => Date.now())
  const [recenterTick, setRecenterTick] = useState(0)
  const [pendingTargetFigure, setPendingTargetFigure] = useState(null)
  const [missionFollowPaused, setMissionFollowPaused] = useState(false)
  const [mapRotationPaused, setMapRotationPaused] = useState(false)
  const reducedMotion = prefersReducedMotion()
  const activeTargetFigureId = useAppStore((state) => state.activeTargetFigureId)
  const setActiveTargetFigureId = useAppStore((state) => state.setActiveTargetFigureId)
  const clearActiveTargetFigure = useAppStore((state) => state.clearActiveTargetFigure)
  const {
    mapPosition,
    position,
    trustedPosition,
    proximityPosition,
    hasUsablePosition,
    error,
    errorType,
    isLoading,
    gpsPhase,
    gpsStatusLabel,
    qualityState,
    showSoftWarning,
    permission,
    geolocationAvailable,
    approximateMessage,
    showPreciseLocationHelp,
    acquisitionStatus,
    acquisitionMessage,
    isWatching,
    retryPreciseLocation,
    requestSingleFix,
    startTracking,
    stopTracking,
  } = useGeolocation()

  const debouncedProximity = useDebouncedLocation(proximityPosition, MAP_PROXIMITY_DEBOUNCE_MS)
  const followCenter = useThrottledMapCenter(mapPosition, {
    minIntervalMs: MAP_FOLLOW_MIN_INTERVAL_MS,
    minMoveMeters: MAP_FOLLOW_MIN_MOVE_METERS,
  })
  const {
    nearFigure,
    isNearFigure,
    nearFigures,
    nearestFigure,
    nearestDistance,
    secondaryNearFigure,
    isFocusNear,
    activeTargetStale,
  } = useFigureProximity(debouncedProximity, proximityFigures, { activeTargetFigureId })

  const activeTargetFigure = useMemo(() => {
    if (!activeTargetFigureId) return null
    return (
      figures.find((figure) => String(figure.id) === String(activeTargetFigureId)) ??
      proximityFigures.find((figure) => String(figure.id) === String(activeTargetFigureId)) ??
      null
    )
  }, [activeTargetFigureId, figures, proximityFigures])

  useEffect(() => {
    if (activeTargetStale) clearActiveTargetFigure()
  }, [activeTargetStale, clearActiveTargetFigure])

  const handleFigureClick = useCallback((figure) => {
    if (figure?.obtenida) return
    setPendingTargetFigure(figure)
  }, [])

  const handleConfirmTarget = useCallback(() => {
    if (!pendingTargetFigure) return

    setActiveTargetFigureId(pendingTargetFigure.id)
    setPendingTargetFigure(null)

    if (mapRef.current && mapPosition) {
      const bounds = L.latLngBounds([
        [mapPosition.lat, mapPosition.lng],
        [pendingTargetFigure.lat, pendingTargetFigure.lng],
      ])
      mapRef.current.fitBounds(bounds, {
        padding: [72, 72],
        maxZoom: 16,
        animate: !reducedMotion,
      })
    }
  }, [mapPosition, pendingTargetFigure, reducedMotion, setActiveTargetFigureId])

  const handleCancelTracking = useCallback(() => {
    clearActiveTargetFigure()
    setPendingTargetFigure(null)
  }, [clearActiveTargetFigure])

  const handleFollowPausedChange = useCallback((paused) => {
    setMissionFollowPaused(paused)
  }, [])

  const handleRotationPausedChange = useCallback((paused) => {
    setMapRotationPaused(paused)
  }, [])

  const cinematicRotationEnabled = !reducedMotion
  const { bearing: cinematicBearing } = useCinematicMapBearing(mapPosition, {
    enabled: cinematicRotationEnabled,
    paused: mapRotationPaused,
  })

  const cinematicModeActive =
    cinematicRotationEnabled && cinematicBearing != null && !mapRotationPaused

  const showFocusOverlay = useStableBoolean(isFocusNear, {
    enterMs: TARGET_LOCK_FOCUS_NEAR_ENTER_MS,
    holdOffMs: TARGET_LOCK_FOCUS_NEAR_HOLD_MS,
  })

  const showSecondaryHint = useStableBoolean(Boolean(secondaryNearFigure), {
    holdOffMs: TARGET_LOCK_SECONDARY_HINT_HOLD_MS,
  })

  const rawNearest = useMemo(
    () => findNearestPendingFigure(mapPosition, figures),
    [mapPosition, figures],
  )

  const proximityNearest = useMemo(() => {
    if (!nearestFigure) return null
    return {
      figure: nearestFigure,
      distanceMeters: nearestDistance,
    }
  }, [nearestFigure, nearestDistance])

  const nearFigureIdsKey = useMemo(
    () =>
      nearFigures
        .map((figure) => String(figure.id))
        .sort()
        .join(','),
    [nearFigures],
  )

  const markerFigures = useMemo(() => {
    const byId = new Map(figures.map((figure) => [String(figure.id), figure]))
    nearFigures.forEach((figure) => {
      if (figure.is_bonus && !byId.has(String(figure.id))) {
        byId.set(String(figure.id), figure)
      }
    })
    return [...byId.values()]
  }, [figures, nearFigureIdsKey, nearFigures])

  const markerFiguresSignature = useMemo(
    () => buildFiguresLayerSignature(markerFigures),
    [markerFigures],
  )

  const lastNearSyncRef = useRef(null)
  const lastVibratedFigureIdRef = useRef(null)
  const bonusVibratedIdsRef = useRef(new Set())
  const visibleFigureIds = useMemo(
    () => new Set(figures.map((figure) => String(figure.id))),
    [figures],
  )

  const handleOpenCamera = useCallback(() => {
    const capturePosition = proximityPosition ?? mapPosition ?? position
    onOpenCamera?.({
      figure: nearFigure,
      position: capturePosition,
      distanceToFigure: nearFigure?.distanceMeters ?? nearestDistance,
    })
  }, [
    mapPosition,
    nearFigure,
    nearestDistance,
    onOpenCamera,
    position,
    proximityPosition,
  ])

  const handleRecenter = useCallback(() => {
    if (!mapRef.current || !mapPosition) return

    setMissionFollowPaused(false)
    mapRef.current.flyTo([mapPosition.lat, mapPosition.lng], USER_ZOOM, {
      animate: !reducedMotion,
      duration: reducedMotion ? 0 : 0.7,
    })
    setRecenterTick((tick) => tick + 1)
  }, [mapPosition, reducedMotion])

  useEffect(() => {
    if (!nearFigure) {
      if (lastNearSyncRef.current !== null) {
        lastNearSyncRef.current = null
        onNearFigureChange?.(null)
      }
      lastVibratedFigureIdRef.current = null
      return
    }

    const distBucket =
      nearFigure.distanceMeters != null
        ? Math.floor(nearFigure.distanceMeters / MAP_NEAR_SYNC_DISTANCE_BUCKET_M)
        : null
    const syncKey = `${nearFigure.id}:${nearFigure.proximity?.phase ?? 'none'}:${distBucket}`

    if (lastNearSyncRef.current !== syncKey) {
      lastNearSyncRef.current = syncKey
      onNearFigureChange?.(nearFigure)
    }
  }, [nearFigure, onNearFigureChange])

  useEffect(() => {
    if (!nearFigure) return

    const isLockedTarget = Boolean(activeTargetFigureId)
    const shouldDiscoverBonus =
      nearFigure.is_bonus &&
      !visibleFigureIds.has(String(nearFigure.id)) &&
      (!isLockedTarget || String(nearFigure.id) === String(activeTargetFigureId))

    if (shouldDiscoverBonus) {
      onBonusDiscovered?.(nearFigure)
    }

    const phase = nearFigure.proximity?.phase ?? 'medium'
    if (lastVibratedFigureIdRef.current !== nearFigure.id) {
      if (vibrateFigureProximityAlert(nearFigure, phase, FIGURE_ALERT_COOLDOWN_MS)) {
        lastVibratedFigureIdRef.current = nearFigure.id
      }
    }

    if (
      nearFigure.is_bonus &&
      !bonusVibratedIdsRef.current.has(String(nearFigure.id)) &&
      (!isLockedTarget || String(nearFigure.id) === String(activeTargetFigureId))
    ) {
      vibrateFigureProximityAlert(nearFigure, 'close', FIGURE_ALERT_COOLDOWN_MS)
      bonusVibratedIdsRef.current.add(String(nearFigure.id))
    }
  }, [
    activeTargetFigureId,
    nearFigure,
    onBonusDiscovered,
    visibleFigureIds,
  ])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    logGpsSnapshot({
      geolocationAvailable,
      isWatching,
      mapPosition,
      proximityPosition,
      gpsPhase,
      gpsStatusLabel,
      qualityState,
      nearFigureId: nearFigure?.id ?? null,
      proximityFigureCount: proximityFigures?.length ?? 0,
    })
  }, [
    geolocationAvailable,
    gpsPhase,
    isWatching,
    mapPosition?.lat,
    mapPosition?.lng,
    nearFigure?.id,
    proximityFigures?.length,
    proximityPosition?.lat,
    proximityPosition?.lng,
    qualityState,
  ])

  const showAcquisitionBanner =
    (acquisitionStatus === 'initializing' ||
      acquisitionStatus === 'waiting' ||
      acquisitionStatus === 'no_response') &&
    errorType !== 'no_fix'

  const showGpsBanner =
    !error &&
    !mapPosition &&
    !showAcquisitionBanner &&
    (gpsPhase === 'searching' || isLoading || showSoftWarning)

  const showRefiningBanner =
    !error &&
    mapPosition &&
    acquisitionStatus === 'ready' &&
    (gpsPhase === 'refining' ||
      qualityState === 'refining' ||
      showSoftWarning)

  const gpsBannerLabel = showAcquisitionBanner
    ? acquisitionMessage
    : showSoftWarning
      ? 'Señal débil — seguimos buscando…'
      : acquisitionStatus === 'ready' && mapPosition?.accuracy != null
        ? `${gpsStatusLabel} (~${Math.round(mapPosition.accuracy / 10) * 10}m)`
        : mapPosition?.accuracy != null
          ? `${gpsStatusLabel} (~${Math.round(mapPosition.accuracy / 10) * 10}m)`
          : gpsStatusLabel

  const showApproximateBanner = Boolean(approximateMessage) && errorType !== 'denied'

  const showNoFixBanner = errorType === 'no_fix'

  const showHardError = error && errorType === 'denied'

  return (
    <div className={`relative h-full min-h-0 overflow-hidden ${className}`}>
      <div className="map-container gpu-layer absolute inset-0 h-full w-full">
        <MapContainer
          key={mapInstanceKey}
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
            position={followCenter ?? mapPosition}
            zoom={USER_ZOOM}
            reducedMotion={reducedMotion}
            recenterTick={recenterTick}
            missionFollow={Boolean(activeTargetFigureId)}
            followPaused={missionFollowPaused}
          />
          <MapInteractionBridge
            followPauseEnabled={Boolean(activeTargetFigureId)}
            onFollowPausedChange={handleFollowPausedChange}
            onRotationPausedChange={handleRotationPausedChange}
          />
          <MapRotationController
            position={mapPosition}
            bearing={cinematicBearing}
            enabled={cinematicModeActive}
          />
          <FigureMarkersLayer
            figures={markerFigures}
            figuresSignature={markerFiguresSignature}
            nearFigureIdsKey={nearFigureIdsKey}
            activeTargetFigureId={activeTargetFigureId}
            onFigureClick={handleFigureClick}
          />
          {mapPosition && (
            <UserLocationMarker
              position={mapPosition}
              isCoarse={!trustedPosition || !hasUsablePosition}
              cinematicBearing={cinematicBearing}
              cinematicActive={cinematicModeActive}
            />
          )}
        </MapContainer>

        <div className="map-vignette pointer-events-none absolute inset-0 z-[400]" aria-hidden />
      </div>

      {showAcquisitionBanner && (
        <MapGpsStatus
          label={gpsBannerLabel}
          phase={
            acquisitionStatus === 'no_response'
              ? 'warn'
              : acquisitionStatus === 'ready'
                ? 'ready'
                : 'searching'
          }
        />
      )}

      <GeoPolicyBanner position={mapPosition} />

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

      {showNoFixBanner && (
        <div className="safe-top pointer-events-auto absolute inset-x-4 top-16 z-[500] rounded-xl border border-red-400/35 bg-zinc-950/95 px-4 py-3 text-center shadow-lg backdrop-blur-sm">
          <p className="text-sm font-semibold text-red-200">{acquisitionMessage}</p>
          <p className="mt-2 text-xs leading-relaxed text-red-200/90">{error}</p>
          <button
            type="button"
            onClick={retryPreciseLocation}
            className="mt-3 min-h-[44px] w-full rounded-lg border border-red-400/40 bg-red-950/50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-red-100 active:scale-[0.98]"
          >
            Reintentar ubicación precisa
          </button>
        </div>
      )}

      {showApproximateBanner && (
        <div className="safe-top pointer-events-auto absolute inset-x-4 top-16 z-[500] rounded-xl border border-amber-400/35 bg-zinc-950/95 px-4 py-3 text-center shadow-lg backdrop-blur-sm">
          <p className="text-sm leading-relaxed text-amber-100">{approximateMessage}</p>
          {showPreciseLocationHelp && (
            <p className="mt-2 text-left text-[11px] leading-relaxed text-amber-200/90">
              {GPS_PRECISE_LOCATION_HELP}
            </p>
          )}
          <button
            type="button"
            onClick={retryPreciseLocation}
            className="mt-3 min-h-[44px] w-full rounded-lg border border-amber-400/40 bg-amber-950/50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-100 active:scale-[0.98]"
          >
            Reintentar ubicación precisa
          </button>
        </div>
      )}

      {showHardError && (
        <div className="safe-top absolute inset-x-4 top-16 z-[500] rounded-xl bg-red-950/90 px-4 py-3 text-center">
          <p className="text-sm text-red-200">{error}</p>
          <p className="mt-1 text-xs text-red-300/80">
            Habilitalo en ajustes del navegador si lo rechazaste antes.
          </p>
          <button
            type="button"
            onClick={retryPreciseLocation}
            className="mt-2 min-h-[44px] text-xs font-bold uppercase text-white underline"
          >
            Reintentar ubicación precisa
          </button>
        </div>
      )}

      {error && !showHardError && !showApproximateBanner && !showNoFixBanner && (
        <div className="safe-top absolute inset-x-4 top-16 z-[500]">
          <MapGpsStatus label={error} phase="warn" />
          <button
            type="button"
            onClick={retryPreciseLocation}
            className="pointer-events-auto mx-auto mt-2 block text-xs font-medium text-white/70 underline"
          >
            Reintentar ubicación precisa
          </button>
        </div>
      )}

      {mapPosition && (
        <button
          type="button"
          onClick={handleRecenter}
          className="gpu-layer absolute right-4 top-4 z-[500] flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-zinc-900/90 text-white shadow-md active:scale-95"
          aria-label="Centrar en mi ubicación"
        >
          <FaLocationCrosshairs size={18} />
        </button>
      )}

      <MapQaOverlay
        geolocationAvailable={geolocationAvailable}
        permission={permission}
        trustedPosition={trustedPosition}
        onRequestSingleFix={requestSingleFix}
        onRetryPrecise={retryPreciseLocation}
        onStartTracking={startTracking}
        onStopTracking={stopTracking}
        onRecenter={handleRecenter}
        hasMapPosition={Boolean(mapPosition)}
        proximityNearest={proximityNearest}
        rawNearest={rawNearest}
        isNearFigure={isNearFigure}
        nearFigure={nearFigure}
        mapPosition={mapPosition}
        isWatching={isWatching}
        figures={figures}
      />

      {activeTargetFigure && (
        <ActiveTargetPill
          figureName={activeTargetFigure.nombre}
          onCancel={handleCancelTracking}
        />
      )}

      <FigureTargetPrompt
        figure={pendingTargetFigure}
        onConfirm={handleConfirmTarget}
        onDismiss={() => setPendingTargetFigure(null)}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500]">
        {activeTargetFigureId && showSecondaryHint && (
          <p className="pointer-events-none mb-2 px-4 text-center text-xs font-medium text-white/45">
            Hay otra figurita cerca…
          </p>
        )}
        {showFocusOverlay && nearFigure && (
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
