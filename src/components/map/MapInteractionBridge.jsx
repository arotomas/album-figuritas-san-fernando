import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { MISSION_FOLLOW_RESUME_MS } from '../../config/proximity'
import { mapDebugLog } from '../../utils/mapDebugLog'
import { isCameraMoveLoggingEnabled } from '../../utils/cameraMoveLog'
import { logCameraMove } from '../../utils/cameraMoveLog'
import { useMapCameraDebugStore } from '../../store/mapCameraDebugStore'
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
    const setResumePending = (pending) => {
      if (!isCameraMoveLoggingEnabled()) return
      useMapCameraDebugStore.getState().setRuntime({ missionFollowResumePending: pending })
    }

    const clearResumeTimer = () => {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current)
        resumeTimerRef.current = null
      }
      setResumePending(false)
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
      if (isCameraMoveLoggingEnabled()) {
        useMapCameraDebugStore.getState().setRuntime({ userControlled: true })
      }
      markGestureActive()
    }

    const scheduleResume = () => {
      if (!autoResumeFollow) return
      if (userControlledRef?.current) return
      clearResumeTimer()
      mapDebugLog('autoFollow', 'mission follow resume scheduled', {
        ms: rotationPauseResumeMs,
      })
      setResumePending(true)
      resumeTimerRef.current = setTimeout(() => {
        resumeTimerRef.current = null
        if (userControlledRef?.current) {
          mapDebugLog('autoFollow', 'mission follow resume cancelled (user control)')
          return
        }
        logCameraMove('MapInteractionBridge.missionFollowResume', {
          method: 'resumeFollow',
          ms: rotationPauseResumeMs,
          note: 'despausa follow; MapFlyController puede mover cámara en el próximo tick GPS',
        })
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
      if (fromUser) {
        markUserControl()
      } else {
        scheduleResume()
      }
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
      logCameraMove('MapInteractionBridge.dragstart', { method: 'dragstart' })
      mapDebugLog('gesture', 'dragstart — user control locked')
      markGestureActive('drag')
      pause({ fromUser: true })
    }

    const onDragEnd = () => {
      logCameraMove('MapInteractionBridge.dragend', {
        method: 'dragend',
        userControlled: userControlledRef?.current,
        autoResumeFollow,
      })
      mapDebugLog('gesture', 'dragend', {
        userControlled: userControlledRef?.current,
        autoResumeFollow,
      })
      markGestureEnded()
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
    map.on('dragend', onDragEnd)
    map.on('movestart', onMoveStart)
    map.on('zoomstart', onZoomStart)
    map.on('touchstart', onGestureStart)
    map.on('moveend', markGestureEnded)
    map.on('zoomend', markGestureEnded)
    container.addEventListener('touchstart', onPinchTouchStart, { passive: true })

    return () => {
      map.off('dragstart', onDragStart)
      map.off('dragend', onDragEnd)
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
