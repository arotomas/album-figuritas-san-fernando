import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { MISSION_FOLLOW_RESUME_MS } from '../../config/proximity'
import { registerUserDragStart } from '../../utils/mapUserDragFollowIsolation'

/**
 * Pausa el pan automático y/o la rotación cinematográfica tras gestos manuales en el mapa.
 * Con autoResumeFollow, el pan vuelve solo tras una pausa (modo misión).
 */
export function MapInteractionBridge({
  autoResumeFollow = false,
  userControlledRef,
  mapGestureActiveRef,
  onFollowPausedChange,
  onRotationPausedChange,
  rotationPauseResumeMs = MISSION_FOLLOW_RESUME_MS,
  gestureEndHoldMs = 360,
}) {
  const map = useMap()
  const resumeTimerRef = useRef(null)
  const gestureEndTimerRef = useRef(null)

  useEffect(() => {
    const clearResumeTimer = () => {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current)
        resumeTimerRef.current = null
      }
    }

    const clearGestureEndTimer = () => {
      if (gestureEndTimerRef.current) {
        clearTimeout(gestureEndTimerRef.current)
        gestureEndTimerRef.current = null
      }
    }

    const markGestureActive = () => {
      if (mapGestureActiveRef) mapGestureActiveRef.current = true
      clearGestureEndTimer()
    }

    const markGestureEnded = () => {
      clearGestureEndTimer()
      gestureEndTimerRef.current = setTimeout(() => {
        gestureEndTimerRef.current = null
        if (mapGestureActiveRef) mapGestureActiveRef.current = false
      }, gestureEndHoldMs)
    }

    const markUserControl = (source) => {
      registerUserDragStart(source)
      if (userControlledRef) userControlledRef.current = true
      markGestureActive()
    }

    const scheduleResume = () => {
      if (!autoResumeFollow) return
      if (userControlledRef?.current) return
      clearResumeTimer()
      resumeTimerRef.current = setTimeout(() => {
        resumeTimerRef.current = null
        if (userControlledRef?.current) return
        onRotationPausedChange?.(false)
        onFollowPausedChange?.(false)
      }, rotationPauseResumeMs)
    }

    const pause = ({ fromUser = true, source = 'unknown' } = {}) => {
      clearResumeTimer()
      onRotationPausedChange?.(true)
      onFollowPausedChange?.(true)
      if (fromUser) {
        markUserControl(source)
        return
      }
      scheduleResume()
    }

    const onZoomStart = (event) => {
      if (event?.originalEvent) pause({ fromUser: true, source: 'zoomstart' })
    }

    const onMoveStart = (event) => {
      if (event?.originalEvent || map.dragging?.moved?.()) {
        pause({ fromUser: true, source: 'movestart' })
      }
    }

    const container = map.getContainer()
    const onPinchTouchStart = (event) => {
      if (event.touches?.length >= 2) pause({ fromUser: true, source: 'pinch-touchstart' })
    }

    const onDragStart = () => {
      pause({ fromUser: true, source: 'dragstart' })
    }

    const onGestureStart = () => {
      markGestureActive()
    }

    map.on('dragstart', onDragStart)
    map.on('movestart', onMoveStart)
    map.on('zoomstart', onZoomStart)
    map.on('touchstart', onGestureStart)
    map.on('moveend', markGestureEnded)
    map.on('zoomend', markGestureEnded)
    container.addEventListener('touchstart', onPinchTouchStart, { passive: true })

    return () => {
      map.off('dragstart', onDragStart)
      map.off('movestart', onMoveStart)
      map.off('zoomstart', onZoomStart)
      map.off('touchstart', onGestureStart)
      map.off('moveend', markGestureEnded)
      map.off('zoomend', markGestureEnded)
      container.removeEventListener('touchstart', onPinchTouchStart)
      clearResumeTimer()
      clearGestureEndTimer()
    }
  }, [
    autoResumeFollow,
    gestureEndHoldMs,
    map,
    mapGestureActiveRef,
    onFollowPausedChange,
    onRotationPausedChange,
    rotationPauseResumeMs,
    userControlledRef,
  ])

  return null
}
