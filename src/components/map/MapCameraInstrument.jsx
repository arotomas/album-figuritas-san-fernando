import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { logCameraMove, isCameraMoveLoggingEnabled } from '../../utils/cameraMoveLog'

/**
 * Parchea TODOS los métodos de cámara Leaflet (incl. flyToBounds).
 * Activar con ?map_debug_log=1
 */
export function MapCameraInstrument() {
  const map = useMap()

  useEffect(() => {
    if (!isCameraMoveLoggingEnabled()) return undefined

    const originals = {
      flyTo: map.flyTo.bind(map),
      panTo: map.panTo.bind(map),
      setView: map.setView.bind(map),
      fitBounds: map.fitBounds.bind(map),
      flyToBounds: map.flyToBounds.bind(map),
      invalidateSize: map.invalidateSize.bind(map),
    }

    map.flyTo = (latlng, zoom, options) => {
      logCameraMove('map.flyTo', {
        method: 'flyTo',
        latlng,
        zoom,
        options,
      })
      return originals.flyTo(latlng, zoom, options)
    }

    map.panTo = (latlng, options) => {
      logCameraMove('map.panTo', {
        method: 'panTo',
        latlng,
        options,
      })
      return originals.panTo(latlng, options)
    }

    map.setView = (center, zoom, options) => {
      logCameraMove('map.setView', {
        method: 'setView',
        center,
        zoom,
        options,
      })
      return originals.setView(center, zoom, options)
    }

    map.fitBounds = (bounds, options) => {
      logCameraMove('map.fitBounds', {
        method: 'fitBounds',
        bounds,
        options,
      })
      return originals.fitBounds(bounds, options)
    }

    map.flyToBounds = (bounds, options) => {
      logCameraMove('map.flyToBounds', {
        method: 'flyToBounds',
        bounds,
        options,
      })
      return originals.flyToBounds(bounds, options)
    }

    map.invalidateSize = (options) => {
      logCameraMove('map.invalidateSize', {
        method: 'invalidateSize',
        options,
      })
      return originals.invalidateSize(options)
    }

    logCameraMove('MapCameraInstrument.attached', { method: 'init' })

    return () => {
      map.flyTo = originals.flyTo
      map.panTo = originals.panTo
      map.setView = originals.setView
      map.fitBounds = originals.fitBounds
      map.flyToBounds = originals.flyToBounds
      map.invalidateSize = originals.invalidateSize
      logCameraMove('MapCameraInstrument.detached', { method: 'cleanup' })
    }
  }, [map])

  return null
}
