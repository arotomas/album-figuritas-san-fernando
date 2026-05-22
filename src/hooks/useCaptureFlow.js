import { useCallback, useEffect, useRef, useState } from 'react'
import { useCamera } from './useCamera'
import { useGpsStability } from './useGpsStability'
import { captureFrameFromVideo, loadImageFromFile } from '../utils/camera'
import { compressImage } from '../utils/imageCompression'
import { vibrateCapture, vibrateReady, vibrateUnlock } from '../utils/vibration'
import { getDistanceMeters } from '../utils/geo'
import { PROXIMITY_EXIT_METERS } from '../config/ux'
import { getQaState, setQaFlag } from '../utils/diagnostics'
import { captureLog, albumLog, rewardLog } from '../utils/devLog'

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
  const capturingRef = useRef(false)
  const phaseRef = useRef(CAPTURE_PHASES.CAMERA)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const isReady =
    (camera.isReady || camera.useNativeFallback) &&
    isStable &&
    phase === CAPTURE_PHASES.CAMERA

  const validateDistance = useCallback(() => {
    if (!position || !figure) return true

    const distanceMeters = getDistanceMeters(
      position.lat,
      position.lng,
      figure.lat,
      figure.lng,
    )

    if (distanceMeters > PROXIMITY_EXIT_METERS) {
      captureLog.warn('blocked — too far', {
        figureId: figure.id,
        distanceMeters: Math.round(distanceMeters),
      })
      setCaptureError('Estás lejos del punto. Acercate para capturar.')
      return false
    }

    return true
  }, [figure, position])

  useEffect(() => {
    if (isReady && !hasVibratedReadyRef.current) {
      if (vibrateReady()) {
        hasVibratedReadyRef.current = true
        captureLog.info('ready to capture', { figureId: figure?.id })
      }
    }

    if (!isStable && !isReady) {
      hasVibratedReadyRef.current = false
    }
  }, [isReady, isStable, figure?.id])

  const runObtainAndReward = useCallback(
    (photoPayload) => {
      albumLog.info('saving figure', { figureId: figure?.id })
      onObtainFigure?.(figure.id, photoPayload)
      camera.stop()
      setPhase(CAPTURE_PHASES.REWARD)
      rewardLog.info('enter reward phase', { figureId: figure?.id })
    },
    [camera, figure, onObtainFigure],
  )

  const processCanvas = useCallback(
    async (canvas) => {
      setPhase(CAPTURE_PHASES.COMPRESSING)
      const compressed = await compressImage(canvas, {
        maxWidth: 960,
        quality: 0.68,
      })

      setCompressedPhoto(compressed.dataUrl)
      captureLog.info('capture compressed', { bytes: compressed.sizeBytes })

      runObtainAndReward({
        foto: compressed.dataUrl,
        fotoSizeBytes: compressed.sizeBytes,
        obtenidaEn: Date.now(),
      })
    },
    [runObtainAndReward],
  )

  useEffect(() => {
    if (!import.meta.env.DEV || !getQaState().simulateCaptureSuccess) return
    if (!figure || !position || phase !== CAPTURE_PHASES.CAMERA) return
    if (!camera.isReady || !isStable) return

    setQaFlag('simulateCaptureSuccess', false)
    captureLog.info('QA simulate capture success')
    runObtainAndReward({
      foto: null,
      fotoSizeBytes: 0,
      obtenidaEn: Date.now(),
    })
  }, [camera.isReady, figure, isStable, phase, position, runObtainAndReward])

  const capture = useCallback(async () => {
    if (capturingRef.current || phaseRef.current !== CAPTURE_PHASES.CAMERA) {
      return
    }

    if (!isStable || !figure) return

    if (camera.useNativeFallback) {
      camera.openNativePicker()
      return
    }

    const video = camera.getVideoElement?.()
    if (!camera.isReady || !video) return
    if (!validateDistance()) return

    capturingRef.current = true
    setCaptureError(null)
    setPhase(CAPTURE_PHASES.CAPTURING)
    captureLog.info('capture started', { figureId: figure.id })
    vibrateCapture()

    try {
      const canvas = captureFrameFromVideo(video)
      await processCanvas(canvas)
    } catch (err) {
      capturingRef.current = false
      captureLog.warn('capture failed', err?.message)
      setCaptureError(err.message || 'Error al capturar la foto.')
      setPhase(CAPTURE_PHASES.CAMERA)
    }
  }, [camera, figure, isStable, processCanvas, validateDistance])

  const captureFromFile = useCallback(
    async (file) => {
      if (capturingRef.current || !file || !figure || !isStable) return
      if (!validateDistance()) return

      capturingRef.current = true
      setCaptureError(null)
      setPhase(CAPTURE_PHASES.CAPTURING)
      captureLog.info('native capture started', { figureId: figure.id })
      vibrateCapture()

      try {
        const canvas = await loadImageFromFile(file)
        await processCanvas(canvas)
      } catch (err) {
        capturingRef.current = false
        captureLog.warn('native capture failed', err?.message)
        setCaptureError('No pudimos usar esa foto. Reintentá.')
        setPhase(CAPTURE_PHASES.CAMERA)
      }
    },
    [figure, isStable, processCanvas, validateDistance],
  )

  const showRewardComplete = useCallback(() => {
    rewardLog.info('reward complete → unlock')
    vibrateUnlock()
    setPhase(CAPTURE_PHASES.UNLOCK)
  }, [])

  const complete = useCallback(() => {
    rewardLog.info('unlock complete → map')
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
    captureFromFile,
    showRewardComplete,
    complete,
    figure,
  }
}
