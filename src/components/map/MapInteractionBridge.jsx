import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { MISSION_FOLLOW_RESUME_MS } from '../../config/proximity'

/**
 * Pausa el pan automático y/o la rotación cinematográfica tras gestos manuales en el mapa.
 * Con autoResumeFollow, el pan vuelve solo tras una pausa (modo misión).
 */
export function MapInteractionBridge({
  autoResumeFollow = false,
  onFollowPausedChange,
  onRotationPausedChange,
  rotationPauseResumeMs = MISSION_FOLLOW_RESUME_MS,
}) {
  const map = useMap()
  const resumeTimerRef = useRef(null)

  useEffect(() => {
    const clearResumeTimer = () => {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current)
        resumeTimerRef.current = null
      }
    }

    const scheduleResume = () => {
      if (!autoResumeFollow) return
      clearResumeTimer()
      resumeTimerRef.current = setTimeout(() => {
        resumeTimerRef.current = null
        onRotationPausedChange?.(false)
        onFollowPausedChange?.(false)
      }, rotationPauseResumeMs)
    }

    const pause = () => {
      clearResumeTimer()
      onRotationPausedChange?.(true)
      onFollowPausedChange?.(true)
      scheduleResume()
    }

    const onZoomStart = (event) => {
      if (event?.originalEvent) pause()
    }

    const onMoveStart = () => {
      if (map.dragging?.moved?.()) pause()
    }

    const container = map.getContainer()
    const onPinchTouchStart = (event) => {
      if (event.touches?.length >= 2) pause()
    }

    map.on('dragstart', pause)
    map.on('movestart', onMoveStart)
    map.on('zoomstart', onZoomStart)
    container.addEventListener('touchstart', onPinchTouchStart, { passive: true })

    return () => {
      map.off('dragstart', pause)
      map.off('movestart', onMoveStart)
      map.off('zoomstart', onZoomStart)
      container.removeEventListener('touchstart', onPinchTouchStart)
      clearResumeTimer()
    }
  }, [autoResumeFollow, map, onFollowPausedChange, onRotationPausedChange, rotationPauseResumeMs])

  return null
}
