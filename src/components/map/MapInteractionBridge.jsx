import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { MISSION_FOLLOW_RESUME_MS } from '../../config/proximity'
import { mapDebugLog } from '../../utils/mapDebugLog'
import { setMapDebugGesturePhase } from '../../utils/mapDebugSession'

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

    const markGestureActive = (phase = 'move') => {
      if (mapGestureActiveRef) mapGestureActiveRef.current = true
      setMapDebugGesturePhase(phase)
      clearGestureEndTimer()
    }

    const markGestureEnded = () => {
      clearGestureEndTimer()
      gestureEndTimerRef.current = setTimeout(() => {
        gestureEndTimerRef.current = null
        if (mapGestureActiveRef) mapGestureActiveRef.current = false
        setMapDebugGesturePhase('idle')
        mapDebugLog('gesture', 'gesture idle')
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

    const onMoveStart = (event) => {
      if (event?.originalEvent || map.dragging?.moved?.()) {
        markGestureActive('drag')
        pause({ fromUser: true })
      }
    }

    const container = map.getContainer()
    const onPinchTouchStart = (event) => {
      if (event.touches?.length >= 2) {
        markGestureActive('pinch')
        pause({ fromUser: true })
      }
    }

    const onDragStart = () => {
      markGestureActive('drag')
      pause({ fromUser: true })
    }

    const onGestureStart = () => {
      markGestureActive('move')
    }

    const onZoomStart = (event) => {
      if (event?.originalEvent) {
        markGestureActive('zoom')
        pause({ fromUser: true })
      }
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
