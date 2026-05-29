import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { MAP_ROTATION_CSS_MS } from '../../config/mapRotation'
import { prefersReducedMotion } from '../../utils/performance'
import {
  MAP_ROTATION_PROGRESSIVE_STEP,
  canWriteMapPaneStyles,
  getMapRotationProgressiveFlags,
} from '../../config/mapRotationProgressive'
import { logRotationDelta, readPaneRotation } from '../../utils/rotationDeltaLog'

/**
 * Rota el pane del mapa alrededor del usuario (CSS transform, GPU).
 * bearing: grados clockwise desde el norte; el mapa gira -bearing para que "adelante" quede arriba.
 */
export function MapRotationController({ position, bearing, enabled, freeze = false }) {
  const map = useMap()
  const paneRef = useRef(null)
  const lastBearingRef = useRef(null)
  const frozenSnapshotRef = useRef(null)
  const flags = getMapRotationProgressiveFlags()
  const writeStyles = canWriteMapPaneStyles()

  useEffect(() => {
    const pane = map.getPane('mapPane')
    if (!pane) return undefined
    paneRef.current = pane
  }, [map])

  const resolvePivot = () => {
    if (flags.usePivotFromGps) {
      if (!position?.lat || !position?.lng) return null
      const center = map.latLngToContainerPoint([position.lat, position.lng])
      return { originX: center.x, originY: center.y }
    }

    const size = map.getSize()
    return { originX: size.x / 2, originY: size.y / 2 }
  }

  const paintPane = (reason, originX, originY, bearingDeg) => {
    if (!writeStyles) return

    const pane = paneRef.current
    if (!pane) return

    const before = readPaneRotation(pane)
    const nextOrigin = `${originX}px ${originY}px`
    const nextTransform = `rotate(${-bearingDeg}deg)`

    if (flags.applyTransformOrigin) {
      pane.style.transformOrigin = nextOrigin
    }

    if (flags.applyMapPaneTransform) {
      pane.style.transform = nextTransform
    }

    lastBearingRef.current = bearingDeg

    if (
      flags.applyTransformOrigin &&
      before.transformOrigin !== nextOrigin
    ) {
      logRotationDelta({
        file: 'MapRotationController.jsx',
        fn: 'paintPane',
        field: 'mapPane.transformOrigin',
        reason,
        prev: before.transformOrigin,
        next: nextOrigin,
      })
    }

    if (flags.applyMapPaneTransform && before.transform !== nextTransform) {
      logRotationDelta({
        file: 'MapRotationController.jsx',
        fn: 'paintPane',
        field: 'mapPane.transform',
        reason,
        prev: before.transform,
        next: nextTransform,
        meta: { bearingDeg },
      })
    }
  }

  const clearPane = (reason) => {
    if (!writeStyles) return

    const pane = paneRef.current
    if (!pane) return

    const before = readPaneRotation(pane)

    if (flags.applyMapPaneTransform) {
      pane.style.transform = ''
      lastBearingRef.current = null
    }

    if (flags.applyTransformOrigin) {
      pane.style.transformOrigin = ''
    }

    if (before.transformOrigin || before.transform) {
      logRotationDelta({
        file: 'MapRotationController.jsx',
        fn: 'clearPane',
        field: 'mapPane.transform+transformOrigin',
        reason,
        prev: before,
        next: { transformOrigin: '', transform: '' },
      })
    }
  }

  const applySnapshot = (pane, snapshot, reason) => {
    if (!writeStyles) return
    pane.style.transition = 'none'
    pane.style.willChange = 'transform'
    paintPane(reason, snapshot.originX, snapshot.originY, snapshot.bearing)
  }

  const captureSnapshot = (pane, activeBearing) => {
    const origin = pane.style.transformOrigin
    const match = /^([\d.]+)px\s+([\d.]+)px$/.exec(origin ?? '')
    if (match && activeBearing != null) {
      return {
        originX: Number(match[1]),
        originY: Number(match[2]),
        bearing: activeBearing,
      }
    }

    if (activeBearing == null) return null

    const pivot = resolvePivot()
    if (!pivot) return null

    return {
      originX: pivot.originX,
      originY: pivot.originY,
      bearing: activeBearing,
    }
  }

  useEffect(() => {
    const pane = paneRef.current
    if (!pane) return

    if (freeze) {
      if (!writeStyles) return

      if (!frozenSnapshotRef.current) {
        const activeBearing = lastBearingRef.current ?? bearing
        const snapshot = captureSnapshot(pane, activeBearing)
        if (snapshot) frozenSnapshotRef.current = snapshot
      }

      if (frozenSnapshotRef.current) {
        applySnapshot(pane, frozenSnapshotRef.current, 'freeze:snapshot')
      }
      return
    }

    frozenSnapshotRef.current = null

    const reducedMotion = prefersReducedMotion()
    const transition =
      reducedMotion || !enabled
        ? 'none'
        : `transform ${MAP_ROTATION_CSS_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`

    pane.style.transition = transition
    pane.style.willChange =
      enabled && bearing != null && flags.applyMapPaneTransform
        ? 'transform'
        : 'auto'

    if (!enabled || bearing == null) {
      clearPane('effect:disable-or-no-bearing')
      return
    }

    if (!flags.effectPositionOrBearing) {
      return
    }

    const pivot = resolvePivot()
    if (!pivot) {
      clearPane('effect:no-pivot')
      return
    }

    paintPane('effect:positionOrBearing', pivot.originX, pivot.originY, bearing)
  }, [bearing, enabled, freeze, map, position?.lat, position?.lng, writeStyles])

  useEffect(() => {
    if (freeze) return undefined

    if (!enabled || bearing == null) {
      return undefined
    }

    if (bearing != null) {
      lastBearingRef.current = bearing
    }

    const hasSyncListener = flags.syncOriginMoveend || flags.syncOriginZoomend
    if (!hasSyncListener) {
      return undefined
    }

    const syncOrigin = (eventName) => () => {
      const pane = paneRef.current
      if (!pane || lastBearingRef.current == null) return

      const pivot = resolvePivot()
      if (!pivot) return

      paintPane(`syncOrigin:${eventName}`, pivot.originX, pivot.originY, lastBearingRef.current)

      logRotationDelta({
        file: 'MapRotationController.jsx',
        fn: 'syncOrigin',
        field: 'syncOrigin.invoked',
        reason: `syncOrigin:${eventName}`,
        prev: null,
        next: { eventName, originX: pivot.originX, originY: pivot.originY },
      })
    }

    const cleanups = []

    if (flags.syncOriginZoomend) {
      const onZoomEnd = syncOrigin('zoomend')
      map.on('zoomend', onZoomEnd)
      cleanups.push(() => map.off('zoomend', onZoomEnd))
    }

    if (flags.syncOriginMoveend) {
      const onMoveEnd = syncOrigin('moveend')
      map.on('moveend', onMoveEnd)
      cleanups.push(() => map.off('moveend', onMoveEnd))
    }

    return () => {
      cleanups.forEach((off) => off())
    }
  }, [bearing, enabled, freeze, map, position?.lat, position?.lng, writeStyles])

  useEffect(() => {
    return () => {
      clearPane('unmount:cleanup')
      const pane = paneRef.current
      if (!pane) return
      pane.style.transition = ''
      pane.style.willChange = 'auto'
      frozenSnapshotRef.current = null
    }
  }, [])

  return null
}
