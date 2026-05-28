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
    const scheduleResume = () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
      resumeTimerRef.current = setTimeout(() => {
        onRotationPausedChange?.(false)
        if (autoResumeFollow) {
          onFollowPausedChange?.(false)
        }
      }, rotationPauseResumeMs)
    }

    const pause = () => {
      onRotationPausedChange?.(true)
      onFollowPausedChange?.(true)
      scheduleResume()
    }

    const onZoomStart = (event) => {
      if (event?.originalEvent) pause()
    }

    map.on('dragstart', pause)
    map.on('zoomstart', onZoomStart)

    return () => {
      map.off('dragstart', pause)
      map.off('zoomstart', onZoomStart)
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    }
  }, [autoResumeFollow, map, onFollowPausedChange, onRotationPausedChange, rotationPauseResumeMs])

  return null
}
