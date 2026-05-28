import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { MISSION_FOLLOW_RESUME_MS } from '../../config/proximity'
import { mapDebugLog } from '../../utils/mapDebugLog'

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

    const markUserControl = () => {
      if (userControlledRef) userControlledRef.current = true
      markGestureActive()
    }

    const scheduleResume = () => {
      if (!autoResumeFollow) return
      if (userControlledRef?.current) return
      clearResumeTimer()
      mapDebugLog('autoFollow', 'mission follow resume scheduled', {
        ms: rotationPauseResumeMs,
      })
      resumeTimerRef.current = setTimeout(() => {
        resumeTimerRef.current = null
        if (userControlledRef?.current) {
          mapDebugLog('autoFollow', 'mission follow resume cancelled (user control)')
          return
        }
        mapDebugLog('autoFollow', 'mission follow resume → follow unpaused')
        onRotationPausedChange?.(false)
        onFollowPausedChange?.(false)
      }, rotationPauseResumeMs)
    }

    const pause = ({ fromUser = true } = {}) => {
      clearResumeTimer()
      mapDebugLog('gesture', 'map interaction pause', { fromUser })
      onRotationPausedChange?.(true)
      onFollowPausedChange?.(true)
      if (fromUser) markUserControl()
      scheduleResume()
    }

    const onZoomStart = (event) => {
      if (event?.originalEvent) pause({ fromUser: true })
    }

    const onMoveStart = (event) => {
      if (event?.originalEvent || map.dragging?.moved?.()) {
        pause({ fromUser: true })
      }
    }

    const container = map.getContainer()
    const onPinchTouchStart = (event) => {
      if (event.touches?.length >= 2) pause({ fromUser: true })
    }

    const onDragStart = () => {
      pause({ fromUser: true })
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
