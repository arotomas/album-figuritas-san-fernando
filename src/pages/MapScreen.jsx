import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LazyMap } from '../components/performance/LazyMap'
import { ProgressBar } from '../components/ProgressBar'
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
import { isMapFreeCameraEnabled } from '../config/mapCamera'
import { MapTreeDebugStack } from '../components/debug/MapTreeDebugOverlay'
import { recordMapNavStep } from '../components/debug/mapNavAudit'

export function MapScreen() {
  const navigate = useNavigate()
  const freePanMode = isMapFreeCameraEnabled()

  useEffect(() => {
    recordMapNavStep('MapScreen mount', {
      pathname: '/map',
      search: typeof window !== 'undefined' ? window.location.search : '',
    })
  }, [])
  const figures = useAppStore((state) => state.figures)
  const nearFigure = useAppStore((state) => state.nearFigure)
  const setNearFigure = useAppStore((state) => state.setNearFigure)
  const startCaptureSession = useAppStore((state) => state.startCaptureSession)
  const explorationActive = useExplorationStore((state) => state.active)
  const explorationTargetName = useExplorationStore((state) => state.targetName)
  const explorationDistanceMeters = useExplorationStore((state) => state.distanceMeters)
  const explorationHasUserLocation = useExplorationStore((state) => state.hasUserLocation)
  const stopExploration = useExplorationStore((state) => state.stopExploration)
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

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#141416]">
      <MapTreeDebugStack
        source="MapScreen"
        placement="left"
        freePanMode={freePanMode}
        stackIndex={1}
      />
      <ExplorationDistanceBadge
        visible={explorationActive}
        targetName={explorationTargetName}
        distanceMeters={explorationDistanceMeters}
        hasUserLocation={explorationHasUserLocation}
        onExit={stopExploration}
      />

      <LazyMap
        figures={mapFigures}
        proximityFigures={proximityFigures}
        onBonusDiscovered={handleBonusDiscovered}
        onNearFigureChange={handleNearFigureChange}
        onOpenCamera={handleOpenCamera}
      />

      <div className="safe-bottom pointer-events-none absolute inset-x-0 bottom-0 z-10 pb-2">
        <div className="pointer-events-auto mx-4 rounded-2xl border border-white/10 bg-charcoal/95 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <ProgressBar showSimulateLink={false} variant="dark" />
        </div>
      </div>
    </div>
  )
}
