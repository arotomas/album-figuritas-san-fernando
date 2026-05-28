import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { isMapDebugLoggingEnabled } from '../../config/mapDebug'
import { mapDebugLog } from '../../utils/mapDebugLog'
import { mapDebugSession } from '../../utils/mapDebugSession'

/** Parchea métodos Leaflet para loguear flyTo / panTo / invalidateSize (solo diagnóstico). */
export function MapDebugInstrument() {
  const map = useMap()

  useEffect(() => {
    if (!isMapDebugLoggingEnabled()) return undefined

    const originals = {
      flyTo: map.flyTo.bind(map),
      panTo: map.panTo.bind(map),
      setView: map.setView.bind(map),
      fitBounds: map.fitBounds.bind(map),
      invalidateSize: map.invalidateSize.bind(map),
    }

    map.flyTo = (latlng, zoom, options) => {
      mapDebugLog('flyTo', 'map.flyTo', {
        latlng,
        zoom,
        animate: options?.animate,
        duration: options?.duration,
        stack: new Error().stack?.split('\n').slice(1, 4).join(' | '),
      })
      return originals.flyTo(latlng, zoom, options)
    }

    map.panTo = (latlng, options) => {
      mapDebugLog('panTo', 'map.panTo', {
        latlng,
        animate: options?.animate,
        duration: options?.duration,
      })
      return originals.panTo(latlng, options)
    }

    map.setView = (center, zoom, options) => {
      mapDebugLog('setView', 'map.setView', { center, zoom, options })
      return originals.setView(center, zoom, options)
    }

    map.fitBounds = (bounds, options) => {
      mapDebugLog('fitBounds', 'map.fitBounds', { bounds, options })
      return originals.fitBounds(bounds, options)
    }

    map.invalidateSize = (options) => {
      mapDebugLog('invalidateSize', 'map.invalidateSize', {
        animate: options?.animate,
        pan: options?.pan,
        duringGesture: mapDebugSession.gestureActive,
        stack: new Error().stack?.split('\n').slice(1, 4).join(' | '),
      })
      return originals.invalidateSize(options)
    }

    mapDebugLog('gesture', 'MapDebugInstrument attached')

    return () => {
      map.flyTo = originals.flyTo
      map.panTo = originals.panTo
      map.setView = originals.setView
      map.fitBounds = originals.fitBounds
      map.invalidateSize = originals.invalidateSize
    }
  }, [map])

  return null
}
