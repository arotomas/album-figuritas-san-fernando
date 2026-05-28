import { memo, useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { useExplorationStore } from '../../../store/explorationStore'
import { useExplorationDistanceSync } from '../../../hooks/useExplorationMode'
import { runExplorationCamera } from '../../../utils/explorationMap'
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

  useExplorationDistanceSync(userPosition)

  useEffect(() => {
    if (!active) return undefined
    onPauseMapFollow?.(true)
    return () => onPauseMapFollow?.(false)
  }, [active, onPauseMapFollow])

  useEffect(() => {
    if (!active) {
      flewWithoutGpsRef.current = false
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
    targetCoordinates,
    userPosition?.lat,
    userPosition?.lng,
  ])

  if (!active) return null

  return (
    <>
      <ExplorationTargetMarker
        active={active}
        targetCoordinates={targetCoordinates}
        targetName={targetName}
      />
      <ExplorationLineLayer
        active={active}
        userPosition={userPosition}
        targetCoordinates={targetCoordinates}
      />
    </>
  )
}

export const ExplorationController = memo(ExplorationControllerInner)
