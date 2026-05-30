import { useCallback, useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { MAP_RESIZE_MIN_DELTA_PX } from '../../config/map'

/**
 * Mantiene map.getSize() alineado con el contenedor tras PWA banner, teclado o flex.
 */
export function MapSizeSync({ containerRef }) {
  const map = useMap()
  const lastSizeRef = useRef({ w: 0, h: 0 })

  const syncSize = useCallback(
    (source) => {
      const container =
        containerRef?.current ?? map.getContainer()?.parentElement ?? null
      if (!container) return

      const w = container.clientWidth
      const h = container.clientHeight
      const prev = lastSizeRef.current
      const dw = Math.abs(w - prev.w)
      const dh = Math.abs(h - prev.h)

      if (
        prev.w > 0 &&
        prev.h > 0 &&
        dw < MAP_RESIZE_MIN_DELTA_PX &&
        dh < MAP_RESIZE_MIN_DELTA_PX
      ) {
        return
      }

      lastSizeRef.current = { w, h }
      map.invalidateSize({ animate: false, pan: false })

      if (import.meta.env.DEV) {
        const leafletSize = map.getSize()
        console.info('[INVALIDATE_SIZE]', {
          source,
          container: { w, h },
          leaflet: { x: leafletSize?.x, y: leafletSize?.y },
        })
      }
    },
    [containerRef, map],
  )

  useEffect(() => {
    const container =
      containerRef?.current ?? map.getContainer()?.parentElement ?? null
    if (!container) return undefined

    const onViewportUpdate = () => syncSize('viewport-update')
    const onOrientation = () => syncSize('orientationchange')

    onViewportUpdate()

    window.addEventListener('viewport-update', onViewportUpdate)
    window.addEventListener('orientationchange', onOrientation)

    const resizeObserver = new ResizeObserver(() => {
      syncSize('resize-observer')
    })
    resizeObserver.observe(container)

    const onGestureEnd = () => {
      const leafletSize = map.getSize()
      if (
        Math.abs(leafletSize.y - container.clientHeight) >= MAP_RESIZE_MIN_DELTA_PX ||
        Math.abs(leafletSize.x - container.clientWidth) >= MAP_RESIZE_MIN_DELTA_PX
      ) {
        syncSize('gesture-end-mismatch')
      }
    }

    map.on('zoomend', onGestureEnd)
    map.on('moveend', onGestureEnd)

    return () => {
      window.removeEventListener('viewport-update', onViewportUpdate)
      window.removeEventListener('orientationchange', onOrientation)
      resizeObserver.disconnect()
      map.off('zoomend', onGestureEnd)
      map.off('moveend', onGestureEnd)
    }
  }, [containerRef, map, syncSize])

  return null
}
