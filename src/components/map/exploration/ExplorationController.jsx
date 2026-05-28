import { memo, useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { useExplorationStore } from '../../../store/explorationStore'
import { useExplorationDistanceSync } from '../../../hooks/useExplorationMode'
import { fitBoundsBetweenUserAndTarget } from '../../../utils/explorationMap'
import { ExplorationLineLayer } from './ExplorationLineLayer'

function ExplorationControllerInner({
  userPosition,
  reducedMotion = false,
  onPauseMapFollow,
}) {
  const map = useMap()
  const active = useExplorationStore((state) => state.active)
  const targetCoordinates = useExplorationStore((state) => state.targetCoordinates)
  const pendingCamera = useExplorationStore((state) => state.pendingCamera)
  const clearPendingCamera = useExplorationStore((state) => state.clearPendingCamera)

  useExplorationDistanceSync(userPosition)

  useEffect(() => {
    if (!active) return undefined
    onPauseMapFollow?.(true)
    return () => onPauseMapFollow?.(false)
  }, [active, onPauseMapFollow])

  useEffect(() => {
    if (!active || !pendingCamera || !userPosition?.lat || !targetCoordinates) return

    fitBoundsBetweenUserAndTarget(map, userPosition, targetCoordinates, { reducedMotion })
    clearPendingCamera()
  }, [
    active,
    clearPendingCamera,
    map,
    pendingCamera,
    reducedMotion,
    targetCoordinates,
    userPosition,
  ])

  return (
    <ExplorationLineLayer
      active={active}
      userPosition={userPosition}
      targetCoordinates={targetCoordinates}
    />
  )
}

export const ExplorationController = memo(ExplorationControllerInner)
