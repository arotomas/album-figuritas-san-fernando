import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { MAP_ROTATION_CSS_MS } from '../../config/mapRotation'
import { prefersReducedMotion } from '../../utils/performance'
import { MAP_ROTATION_DISABLE_SYNC_ORIGIN_MOVEEND } from '../../config/mapIsolationPreview'
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

  useEffect(() => {
    const pane = map.getPane('mapPane')
    if (!pane) return undefined

    paneRef.current = pane
  }, [map])

  const paintPane = (reason, originX, originY, bearingDeg) => {
    const pane = paneRef.current
    if (!pane) return

    const before = readPaneRotation(pane)
    const nextOrigin = `${originX}px ${originY}px`
    const nextTransform = `rotate(${-bearingDeg}deg)`

    pane.style.transformOrigin = nextOrigin
    pane.style.transform = nextTransform
    lastBearingRef.current = bearingDeg

    if (before.transformOrigin !== nextOrigin) {
      logRotationDelta({
        file: 'MapRotationController.jsx',
        fn: 'paintPane',
        line: 31,
        field: 'mapPane.transformOrigin',
        reason,
        prev: before.transformOrigin,
        next: nextOrigin,
        meta: {
          originX,
          originY,
          position: position
            ? { lat: position.lat, lng: position.lng }
            : null,
        },
      })
    }

    if (before.transform !== nextTransform) {
      logRotationDelta({
        file: 'MapRotationController.jsx',
        fn: 'paintPane',
        line: 32,
        field: 'mapPane.transform',
        reason,
        prev: before.transform,
        next: nextTransform,
        meta: { bearingDeg },
      })
    }
  }

  const clearPane = (reason) => {
    const pane = paneRef.current
    if (!pane) return

    const before = readPaneRotation(pane)
    pane.style.transform = ''
    pane.style.transformOrigin = ''
    lastBearingRef.current = null

    if (before.transformOrigin || before.transform) {
      logRotationDelta({
        file: 'MapRotationController.jsx',
        fn: 'clearPane',
        line: 54,
        field: 'mapPane.transform+transformOrigin',
        reason,
        prev: before,
        next: { transformOrigin: '', transform: '' },
      })
    }
  }

  const applySnapshot = (pane, snapshot, reason) => {
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

    if (!position?.lat || !position?.lng || activeBearing == null) return null

    const center = map.latLngToContainerPoint([position.lat, position.lng])
    return {
      originX: center.x,
      originY: center.y,
      bearing: activeBearing,
    }
  }

  useEffect(() => {
    const pane = paneRef.current
    if (!pane) return

    if (freeze) {
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
    pane.style.willChange = enabled && bearing != null ? 'transform' : 'auto'

    if (!enabled || bearing == null || !position?.lat || !position?.lng) {
      clearPane('effect:disable-or-no-bearing')
      return
    }

    const center = map.latLngToContainerPoint([position.lat, position.lng])
    paintPane(
      'effect:positionOrBearing',
      center.x,
      center.y,
      bearing,
    )
  }, [bearing, enabled, freeze, map, position?.lat, position?.lng])

  useEffect(() => {
    if (freeze) return undefined

    if (!enabled || bearing == null || !position?.lat || !position?.lng) {
      return undefined
    }

    const syncOrigin = (eventName) => () => {
      const pane = paneRef.current
      if (!pane || lastBearingRef.current == null) return

      const center = map.latLngToContainerPoint([position.lat, position.lng])
      const draggingMoved =
        typeof map.dragging?.moved === 'function' ? map.dragging.moved() : null

      paintPane(`syncOrigin:${eventName}`, center.x, center.y, lastBearingRef.current)

      logRotationDelta({
        file: 'MapRotationController.jsx',
        fn: 'syncOrigin',
        line: 149,
        field: 'syncOrigin.invoked',
        reason: `syncOrigin:${eventName}`,
        prev: null,
        next: { eventName, originX: center.x, originY: center.y },
        meta: {
          bearing: lastBearingRef.current,
          draggingMoved,
          mapCenter: map.getCenter?.()
            ? { lat: map.getCenter().lat, lng: map.getCenter().lng }
            : null,
        },
      })
    }

    const onZoomEnd = syncOrigin('zoomend')

    const onMoveEnd = MAP_ROTATION_DISABLE_SYNC_ORIGIN_MOVEEND
      ? () => {
          logRotationDelta({
            file: 'MapRotationController.jsx',
            fn: 'onMoveEnd',
            line: 198,
            field: 'syncOrigin.moveend',
            reason: 'syncOrigin:moveend:SKIPPED',
            prev: readPaneRotation(paneRef.current).transformOrigin,
            next: readPaneRotation(paneRef.current).transformOrigin,
            meta: { flag: 'MAP_ROTATION_DISABLE_SYNC_ORIGIN_MOVEEND' },
          })
        }
      : syncOrigin('moveend')

    map.on('moveend', onMoveEnd)
    map.on('zoomend', onZoomEnd)
    return () => {
      map.off('moveend', onMoveEnd)
      map.off('zoomend', onZoomEnd)
    }
  }, [bearing, enabled, freeze, map, position?.lat, position?.lng])

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
