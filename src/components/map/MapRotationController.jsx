import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { MAP_ROTATION_CSS_MS } from '../../config/mapRotation'
import { prefersReducedMotion } from '../../utils/performance'

/**
 * Rota el pane del mapa alrededor del usuario (CSS transform, GPU).
 * bearing: grados clockwise desde el norte; el mapa gira -bearing para que "adelante" quede arriba.
 */
export function MapRotationController({ position, bearing, enabled }) {
  const map = useMap()
  const paneRef = useRef(null)
  const lastBearingRef = useRef(null)

  useEffect(() => {
    const pane = map.getPane('mapPane')
    if (!pane) return undefined

    paneRef.current = pane
  }, [map])

  useEffect(() => {
    const pane = paneRef.current
    if (!pane) return

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
  }, [bearing, enabled, map, position?.lat, position?.lng])

  useEffect(() => {
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
  }, [bearing, enabled, map, position?.lat, position?.lng])

  useEffect(() => {
    return () => {
      const pane = paneRef.current
      if (!pane) return
      pane.style.transform = ''
      pane.style.transformOrigin = ''
      pane.style.transition = ''
      pane.style.willChange = 'auto'
    }
  }, [])

  return null
}
