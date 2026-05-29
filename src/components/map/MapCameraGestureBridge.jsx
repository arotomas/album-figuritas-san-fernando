import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

/**
 * Marca control manual de cámara en drag/zoom del usuario.
 * Sin timers ni reactivación automática.
 */
export function MapCameraGestureBridge({ userControlledCameraRef }) {
  const map = useMap()

  useEffect(() => {
    if (!userControlledCameraRef) return undefined

    const lockCamera = () => {
      userControlledCameraRef.current = true
    }

    const onMoveStart = (event) => {
      if (event?.originalEvent || map.dragging?.moved?.()) {
        lockCamera()
      }
    }

    const onZoomStart = (event) => {
      if (event?.originalEvent) lockCamera()
    }

    const container = map.getContainer()
    const onPinchTouchStart = (event) => {
      if (event.touches?.length >= 2) lockCamera()
    }

    map.on('dragstart', lockCamera)
    map.on('movestart', onMoveStart)
    map.on('zoomstart', onZoomStart)
    container.addEventListener('touchstart', onPinchTouchStart, { passive: true })

    return () => {
      map.off('dragstart', lockCamera)
      map.off('movestart', onMoveStart)
      map.off('zoomstart', onZoomStart)
      container.removeEventListener('touchstart', onPinchTouchStart)
    }
  }, [map, userControlledCameraRef])

  return null
}
