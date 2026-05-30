import { memo, useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { useExplorationStore } from '../../../store/explorationStore'
import { useExplorationDistanceSync } from '../../../hooks/useExplorationMode'
import { SIMPLE_ROUTING_EXPERIMENT } from '../../../config/simpleRoutingExperiment'
import { runExplorationCamera } from '../../../utils/explorationMap'
import { SimpleTargetLineLayer } from '../routing'
import { ExplorationLineLayer } from './ExplorationLineLayer'
import { ExplorationTargetMarker } from './ExplorationTargetMarker'

function ExplorationControllerInner({
  userPosition,
  reducedMotion = false,
  onPauseMapFollow,
}) {
  const map = useMap()
  const active = useExplorationStore((state) => state.active)
  const targetCoordinates = useExplorationStore((state) => state.targetCoordinates)
  const targetName = useExplorationStore((state) => state.targetName)
  const pendingCamera = useExplorationStore((state) => state.pendingCamera)
  const clearPendingCamera = useExplorationStore((state) => state.clearPendingCamera)
  const flewWithoutGpsRef = useRef(false)
  const simpleRouting =
    SIMPLE_ROUTING_EXPERIMENT.enabled && SIMPLE_ROUTING_EXPERIMENT.skipExplorationCamera

  useExplorationDistanceSync(userPosition)

  useEffect(() => {
    if (!active) return undefined
    if (!simpleRouting) {
      onPauseMapFollow?.(true)
    }
    return undefined
  }, [active, onPauseMapFollow, simpleRouting])

  useEffect(() => {
    if (!active) {
      flewWithoutGpsRef.current = false
      return undefined
    }

    if (simpleRouting) {
      if (pendingCamera) clearPendingCamera()
      return undefined
    }

    if (!pendingCamera || !targetCoordinates) return undefined

    const hasUser = userPosition?.lat != null && userPosition?.lng != null

    if (hasUser) {
      runExplorationCamera(map, userPosition, targetCoordinates, { reducedMotion })
      flewWithoutGpsRef.current = false
      clearPendingCamera()
      return undefined
    }

    if (!flewWithoutGpsRef.current) {
      flewWithoutGpsRef.current = true
      runExplorationCamera(map, null, targetCoordinates, { reducedMotion })
    }

    return undefined
  }, [
    active,
    clearPendingCamera,
    map,
    pendingCamera,
    reducedMotion,
    simpleRouting,
    targetCoordinates,
    userPosition?.lat,
    userPosition?.lng,
  ])

  if (!active) return null

  console.info('[ROUTE_LINE_RENDER]', {
    source: 'ExplorationController',
    active,
    simpleRouting: SIMPLE_ROUTING_EXPERIMENT.enabled,
    userLat: userPosition?.lat ?? null,
    userLng: userPosition?.lng ?? null,
    targetLat: targetCoordinates?.lat ?? null,
    targetLng: targetCoordinates?.lng ?? null,
  })

  const showTargetMarker =
    !SIMPLE_ROUTING_EXPERIMENT.enabled || !SIMPLE_ROUTING_EXPERIMENT.skipTargetMarker

  return (
    <>
      {showTargetMarker ? (
        <ExplorationTargetMarker
          active={active}
          targetCoordinates={targetCoordinates}
          targetName={targetName}
        />
      ) : null}
      {SIMPLE_ROUTING_EXPERIMENT.enabled ? (
        <SimpleTargetLineLayer
          active={active}
          userPosition={userPosition}
          targetCoordinates={targetCoordinates}
        />
      ) : (
        <ExplorationLineLayer
          active={active}
          userPosition={userPosition}
          targetCoordinates={targetCoordinates}
        />
      )}
    </>
  )
}

export const ExplorationController = memo(ExplorationControllerInner)
