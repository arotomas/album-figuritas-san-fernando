import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { MAP_ROTATION_CSS_MS } from '../../config/mapRotation'
import { prefersReducedMotion } from '../../utils/performance'

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

  const applySnapshot = (pane, snapshot) => {
    pane.style.transition = 'none'
    pane.style.willChange = 'transform'
    pane.style.transformOrigin = `${snapshot.originX}px ${snapshot.originY}px`
    pane.style.transform = `rotate(${-snapshot.bearing}deg)`
    lastBearingRef.current = snapshot.bearing
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
        applySnapshot(pane, frozenSnapshotRef.current)
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
      pane.style.transform = ''
      pane.style.transformOrigin = ''
      lastBearingRef.current = null
      return
    }

    const center = map.latLngToContainerPoint([position.lat, position.lng])
    pane.style.transformOrigin = `${center.x}px ${center.y}px`
    pane.style.transform = `rotate(${-bearing}deg)`
    lastBearingRef.current = bearing
  }, [bearing, enabled, freeze, map, position?.lat, position?.lng])

  useEffect(() => {
    if (freeze) return undefined

    if (!enabled || bearing == null || !position?.lat || !position?.lng) {
      return undefined
    }

    const syncOrigin = () => {
      const pane = paneRef.current
      if (!pane || lastBearingRef.current == null) return
      const center = map.latLngToContainerPoint([position.lat, position.lng])
      pane.style.transformOrigin = `${center.x}px ${center.y}px`
      pane.style.transform = `rotate(${-lastBearingRef.current}deg)`
    }

    map.on('moveend', syncOrigin)
    map.on('zoomend', syncOrigin)
    return () => {
      map.off('moveend', syncOrigin)
      map.off('zoomend', syncOrigin)
    }
  }, [bearing, enabled, freeze, map, position?.lat, position?.lng])

  useEffect(() => {
    return () => {
      const pane = paneRef.current
      if (!pane) return
      pane.style.transform = ''
      pane.style.transformOrigin = ''
      pane.style.transition = ''
      pane.style.willChange = 'auto'
      frozenSnapshotRef.current = null
    }
  }, [])

  return null
}
