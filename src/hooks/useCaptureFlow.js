import { useCallback, useEffect, useRef, useState } from 'react'
import { useCamera } from './useCamera'
import { useGpsStability } from './useGpsStability'
import { captureFrameFromVideo } from '../utils/camera'
import { compressImage } from '../utils/imageCompression'
import { vibrateCapture, vibrateReady, vibrateUnlock } from '../utils/vibration'

export const CAPTURE_PHASES = {
  CAMERA: 'camera',
  CAPTURING: 'capturing',
  COMPRESSING: 'compressing',
  REWARD: 'reward',
  UNLOCK: 'unlock',
  DONE: 'done',
}

/**
 * Orquesta el flujo completo: cámara → validación GPS → captura → compresión → recompensa.
 */
export function useCaptureFlow({ figure, position, onObtainFigure }) {
  const camera = useCamera()
  const { isStable, progress: gpsProgress, accuracy } = useGpsStability(position)

  const [phase, setPhase] = useState(CAPTURE_PHASES.CAMERA)
  const [compressedPhoto, setCompressedPhoto] = useState(null)
  const [captureError, setCaptureError] = useState(null)
  const hasVibratedReadyRef = useRef(false)

  const isReady = camera.isReady && isStable && phase === CAPTURE_PHASES.CAMERA

  useEffect(() => {
    if (isReady && !hasVibratedReadyRef.current) {
      if (vibrateReady()) {
        hasVibratedReadyRef.current = true
      }
    }

    if (!isStable && !isReady) {
      hasVibratedReadyRef.current = false
    }
  }, [isReady, isStable])

  const capture = useCallback(async () => {
    const video = camera.getVideoElement?.()
    if (!camera.isReady || !isStable || !figure || !video) {
      return
    }

    setCaptureError(null)
    setPhase(CAPTURE_PHASES.CAPTURING)
    vibrateCapture()

    try {
      setPhase(CAPTURE_PHASES.COMPRESSING)

      const canvas = captureFrameFromVideo(video)
      const compressed = await compressImage(canvas, {
        maxWidth: 960,
        quality: 0.68,
      })

      setCompressedPhoto(compressed.dataUrl)

      onObtainFigure?.(figure.id, {
        foto: compressed.dataUrl,
        fotoSizeBytes: compressed.sizeBytes,
        obtenidaEn: Date.now(),
      })

      camera.stop()
      setPhase(CAPTURE_PHASES.REWARD)
    } catch (err) {
      setCaptureError(err.message || 'Error al capturar la foto.')
      setPhase(CAPTURE_PHASES.CAMERA)
    }
  }, [camera, figure, isStable, onObtainFigure])

  const showRewardComplete = useCallback(() => {
    vibrateUnlock()
    setPhase(CAPTURE_PHASES.UNLOCK)
  }, [])

  const complete = useCallback(() => {
    setPhase(CAPTURE_PHASES.DONE)
  }, [])

  return {
    phase,
    camera,
    gpsProgress,
    isStable,
    isReady,
    gpsAccuracy: accuracy,
    compressedPhoto,
    captureError,
    capture,
    showRewardComplete,
    complete,
    figure,
  }
}
