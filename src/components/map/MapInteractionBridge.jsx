import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { MISSION_FOLLOW_RESUME_MS } from '../../config/proximity'

/**
 * Pausa follow de misión y/o rotación cinematográfica tras gestos manuales en el mapa.
 */
export function MapInteractionBridge({
  followPauseEnabled = false,
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
        if (followPauseEnabled) {
          onFollowPausedChange?.(false)
        }
      }, rotationPauseResumeMs)
    }

    const pause = () => {
      onRotationPausedChange?.(true)
      if (followPauseEnabled) {
        onFollowPausedChange?.(true)
      }
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
  }, [
    followPauseEnabled,
    map,
    onFollowPausedChange,
    onRotationPausedChange,
    rotationPauseResumeMs,
  ])

  return null
}
