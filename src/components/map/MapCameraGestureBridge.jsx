import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { registerUserDragStart } from '../../utils/mapUserDragFollowIsolation'

/**
 * Marca control manual de cámara en drag/zoom del usuario.
 * Sin timers ni reactivación automática.
 */
export function MapCameraGestureBridge({ userControlledCameraRef }) {
  const map = useMap()

  useEffect(() => {
    if (!userControlledCameraRef) return undefined

    const lockCamera = (source) => {
      registerUserDragStart(source)
      userControlledCameraRef.current = true
    }

    const onMoveStart = (event) => {
      if (event?.originalEvent || map.dragging?.moved?.()) {
        lockCamera('movestart')
      }
    }

    const onZoomStart = (event) => {
      if (event?.originalEvent) lockCamera('zoomstart')
    }

    const container = map.getContainer()
    const onPinchTouchStart = (event) => {
      if (event.touches?.length >= 2) lockCamera('pinch-touchstart')
    }

    const onDragStart = () => lockCamera('dragstart')

    map.on('dragstart', onDragStart)
    map.on('movestart', onMoveStart)
    map.on('zoomstart', onZoomStart)
    container.addEventListener('touchstart', onPinchTouchStart, { passive: true })

    return () => {
      map.off('dragstart', onDragStart)
      map.off('movestart', onMoveStart)
      map.off('zoomstart', onZoomStart)
      container.removeEventListener('touchstart', onPinchTouchStart)
    }
  }, [map, userControlledCameraRef])

  return null
}
