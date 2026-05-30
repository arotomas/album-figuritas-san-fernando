import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LazyMap } from '../components/performance/LazyMap'
import { ProgressBar } from '../components/ProgressBar'
import { NavigationMetricsPanel } from '../components/map/routing/NavigationMetricsPanel'
import { RouteMetricsBadge } from '../components/map/routing/RouteMetricsBadge'
import { useGeolocation } from '../hooks/useGeolocation'
import { useQaTestFigure } from '../hooks/useQaTestFigure'
import { useAppStore } from '../store/useAppStore'
import {
  getHiddenBonusDetectionFigures,
  getMainProgressState,
  getPlayerMapFigures,
} from '../utils/figureGameRules'
import { logMapFigurePipeline } from '../utils/universeDiagnostics'
import { useExplorationStore } from '../store/explorationStore'
import { ExplorationDistanceBadge } from '../components/map/exploration/ExplorationDistanceBadge'
import { NAVIGATION_UX_EXPERIMENT } from '../config/navigationUx'
import { STREET_ROUTING_OSRM_EXPERIMENT } from '../config/streetRoutingOsrmExperiment'

export function MapScreen() {
  const navigate = useNavigate()
  const figures = useAppStore((state) => state.figures)
  const activeTargetFigureId = useAppStore((state) => state.activeTargetFigureId)
  const nearFigure = useAppStore((state) => state.nearFigure)
  const setNearFigure = useAppStore((state) => state.setNearFigure)
  const startCaptureSession = useAppStore((state) => state.startCaptureSession)
  const explorationActive = useExplorationStore((state) => state.active)
  const explorationTargetName = useExplorationStore((state) => state.targetName)
  const explorationTargetCoordinates = useExplorationStore((state) => state.targetCoordinates)
  const explorationDistanceMeters = useExplorationStore((state) => state.distanceMeters)
  const explorationHasUserLocation = useExplorationStore((state) => state.hasUserLocation)
  const stopExploration = useExplorationStore((state) => state.stopExploration)
  const { mapPosition } = useGeolocation()
  const [routeMetrics, setRouteMetrics] = useState(null)
  const [discoveredBonusIds, setDiscoveredBonusIds] = useState(() => new Set())
  const mainProgress = useMemo(() => getMainProgressState(figures), [figures])
  const visiblePlayerFigures = useMemo(
    () => getPlayerMapFigures(figures, discoveredBonusIds),
    [discoveredBonusIds, figures],
  )
  const hiddenBonusFigures = useMemo(
    () => getHiddenBonusDetectionFigures(figures),
    [figures],
  )
  const { mapFigures } = useQaTestFigure(visiblePlayerFigures)
  const proximityFigures = useMemo(
    () => [...mapFigures, ...hiddenBonusFigures],
    [hiddenBonusFigures, mapFigures],
  )

  const routeTargetCoordinates = useMemo(() => {
    if (explorationActive && explorationTargetCoordinates) {
      return explorationTargetCoordinates
    }
    if (!activeTargetFigureId) return null
    const figure =
      figures.find((item) => String(item.id) === String(activeTargetFigureId)) ??
      mapFigures.find((item) => String(item.id) === String(activeTargetFigureId)) ??
      null
    if (!figure) return null
    const lat = Number(figure.lat)
    const lng = Number(figure.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  }, [
    activeTargetFigureId,
    explorationActive,
    explorationTargetCoordinates,
    figures,
    mapFigures,
  ])

  const routeNavigationActive =
    STREET_ROUTING_OSRM_EXPERIMENT.enabled &&
    Boolean(routeMetrics) &&
    (explorationActive || Boolean(activeTargetFigureId))

  const navigationMetricsTopClass = explorationActive
    ? 'safe-top top-[8.5rem]'
    : 'safe-top top-[4.25rem]'

  const handleBonusDiscovered = useCallback((figure) => {
    if (!figure?.id) return
    setDiscoveredBonusIds((current) => {
      const key = String(figure.id)
      if (current.has(key)) return current
      const next = new Set(current)
      next.add(key)
      return next
    })
  }, [])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    logMapFigurePipeline({
      figures,
      visiblePlayerFigures,
      mapFigures,
      proximityFigures,
      discoveredBonusIds,
    })
    console.info('[map-figures]', 'render input', JSON.stringify({
      storedCount: figures.length,
      renderedCount: mapFigures.length,
      storedIds: figures.map((figure) => String(figure.id)),
      renderedIds: mapFigures.map((figure) => String(figure.id)),
      catalogSource: figures.length === 0 ? 'empty' : 'remote',
      mainProgress,
    }))
  }, [figures, mainProgress, mapFigures])

  const handleNearFigureChange = useCallback((figure) => {
    setNearFigure(figure)
  }, [setNearFigure])

  const handleOpenCamera = useCallback(
    ({ figure: sessionFigure, position, distanceToFigure } = {}) => {
      const target = sessionFigure ?? nearFigure
      if (!target) return
      const targetId = target.targetFigureId ?? target.id
      const stored = figures.find((f) => String(f.id) === String(targetId))
      if (stored?.obtenida) return

      startCaptureSession({
        figure: target,
        position,
        distanceToFigure,
      })
      navigate('/capture')
    },
    [figures, nearFigure, navigate, startCaptureSession],
  )

  const handleRouteMetricsChange = useCallback((metrics) => {
    setRouteMetrics(metrics)
  }, [])

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ExplorationDistanceBadge
        visible={explorationActive}
        targetName={explorationTargetName}
        distanceMeters={explorationDistanceMeters}
        hasUserLocation={explorationHasUserLocation}
        onExit={stopExploration}
      />

      {NAVIGATION_UX_EXPERIMENT.enabled ? (
        <NavigationMetricsPanel
          visible={routeNavigationActive}
          metrics={routeMetrics}
          userPosition={mapPosition}
          targetCoordinates={routeTargetCoordinates}
          className={navigationMetricsTopClass}
        />
      ) : STREET_ROUTING_OSRM_EXPERIMENT.enabled && explorationActive ? (
        <RouteMetricsBadge
          visible={Boolean(routeMetrics)}
          metrics={routeMetrics}
          className="safe-top top-[8.5rem]"
        />
      ) : null}

      <LazyMap
        figures={mapFigures}
        proximityFigures={proximityFigures}
        onBonusDiscovered={handleBonusDiscovered}
        onNearFigureChange={handleNearFigureChange}
        onOpenCamera={handleOpenCamera}
        onRouteMetricsChange={handleRouteMetricsChange}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[510] px-4 pb-2">
        <div className="pointer-events-auto rounded-2xl border border-progress/35 bg-warm-white p-4 shadow-[0_8px_24px_rgba(17,17,19,0.1),0_2px_10px_rgba(140,198,63,0.07)]">
          <ProgressBar showSimulateLink={false} variant="dark" />
        </div>
      </div>
    </div>
  )
}
