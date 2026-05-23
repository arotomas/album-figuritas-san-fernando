import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCamera } from './useCamera'
import { captureFrameFromVideo, loadImageFromFile } from '../utils/camera'
import { compressImage } from '../utils/imageCompression'
import { vibrateCapture, vibrateReady, vibrateUnlock } from '../utils/vibration'
import { getDistanceMeters } from '../utils/geo'
import { CAPTURE_MAX_DISTANCE_METERS } from '../config/ux'
import { GPS_APPROXIMATE_CAPTURE_WARNING_M } from '../config/gps'
import {
  buildCaptureRecord,
  processCaptureForUnlock,
} from '../services/captureService'
import { getQaState, setQaFlag } from '../utils/diagnostics'
import { cameraLog } from '../utils/cameraLog'
import { captureLog, albumLog, rewardLog } from '../utils/devLog'

export const CAPTURE_PHASES = {
  CAMERA: 'camera',
  CAPTURING: 'capturing',
  COMPRESSING: 'compressing',
  REWARD: 'reward',
  UNLOCK: 'unlock',
  DONE: 'done',
}

function getDistanceToFigure(position, figure) {
  if (!position || !figure) return null
  return getDistanceMeters(position.lat, position.lng, figure.lat, figure.lng)
}

function getFileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

/**
 * Orquesta el flujo: cámara → proximidad flexible → foto obligatoria → recompensa.
 */
export function useCaptureFlow({ figure, position, onObtainFigure }) {
  const camera = useCamera()

  const [phase, setPhase] = useState(CAPTURE_PHASES.CAMERA)
  const [compressedPhoto, setCompressedPhoto] = useState(null)
  const [captureError, setCaptureError] = useState(null)
  const hasVibratedReadyRef = useRef(false)
  const capturingRef = useRef(false)
  const phaseRef = useRef(CAPTURE_PHASES.CAMERA)
  const lastProcessedFileKeyRef = useRef(null)
  const unlockSubmittedRef = useRef(false)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const distanceMeters = useMemo(
    () => getDistanceToFigure(position, figure),
    [figure, position],
  )

  const inCaptureRange =
    distanceMeters != null && distanceMeters <= CAPTURE_MAX_DISTANCE_METERS

  const isApproximateGps =
    position?.accuracy != null &&
    position.accuracy > GPS_APPROXIMATE_CAPTURE_WARNING_M

  const gpsProgress = useMemo(() => {
    if (!position || distanceMeters == null) return 0
    if (inCaptureRange) return 1
    return Math.max(0, 1 - distanceMeters / CAPTURE_MAX_DISTANCE_METERS)
  }, [distanceMeters, inCaptureRange, position])

  const isReady =
    camera.isReady &&
    inCaptureRange &&
    phase === CAPTURE_PHASES.CAMERA &&
    !capturingRef.current

  const validateDistance = useCallback(() => {
    if (!position || !figure) {
      setCaptureError('Esperá a que el GPS confirme tu ubicación.')
      return false
    }

    const currentDistance = getDistanceToFigure(position, figure)
    if (currentDistance == null || currentDistance > CAPTURE_MAX_DISTANCE_METERS) {
      captureLog.warn('blocked — too far', {
        figureId: figure.id,
        distanceMeters: currentDistance != null ? Math.round(currentDistance) : null,
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

    if (!isReady) {
      hasVibratedReadyRef.current = false
    }
  }, [isReady, figure?.id])

  const runObtainAndReward = useCallback(
    (photoPayload) => {
      if (unlockSubmittedRef.current) {
        return
      }

      if (!photoPayload?.foto) {
        captureLog.warn('blocked — photo required', { figureId: figure?.id })
        setCaptureError('Tenés que sacar una foto para desbloquear la figurita.')
        setPhase(CAPTURE_PHASES.CAMERA)
        capturingRef.current = false
        return
      }

      unlockSubmittedRef.current = true
      setCaptureError(null)

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
      if (!position || !figure) {
        throw new Error('Ubicación no disponible para registrar la captura.')
      }

      if (phaseRef.current !== CAPTURE_PHASES.CAMERA && phaseRef.current !== CAPTURE_PHASES.CAPTURING) {
        return
      }

      setCaptureError(null)
      setPhase(CAPTURE_PHASES.COMPRESSING)

      const compressed = await compressImage(canvas, {
        maxWidth: 960,
        quality: 0.68,
      })

      if (!compressed?.dataUrl) {
        throw new Error('No pudimos procesar la foto.')
      }

      setCompressedPhoto(compressed.dataUrl)
      captureLog.info('capture compressed', { bytes: compressed.sizeBytes })

      const distanceToFigure = getDistanceToFigure(position, figure)
      const captureRecord = buildCaptureRecord({
        figureId: figure.id,
        lat: position.lat,
        lng: position.lng,
        accuracy: position.accuracy,
        distanceToFigure,
        photoUrl: compressed.dataUrl,
        createdAt: Date.now(),
      })

      const validatedCapture = await processCaptureForUnlock(captureRecord)

      runObtainAndReward({
        foto: compressed.dataUrl,
        fotoSizeBytes: compressed.sizeBytes,
        obtenidaEn: Date.now(),
        captureRecord: validatedCapture,
      })
    },
    [figure, position, runObtainAndReward],
  )

  useEffect(() => {
    if (!import.meta.env.DEV || !getQaState().simulateCaptureSuccess) return
    if (!figure || !position || phase !== CAPTURE_PHASES.CAMERA) return
    if (!camera.isReady || !inCaptureRange) return

    setQaFlag('simulateCaptureSuccess', false)
    captureLog.info('QA simulate capture success')

    const distanceToFigure = getDistanceToFigure(position, figure)
    const qaPhoto =
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IGZpbGw9IiMzMzMiLz48L3N2Zz4='

    runObtainAndReward({
      foto: qaPhoto,
      fotoSizeBytes: qaPhoto.length,
      obtenidaEn: Date.now(),
      captureRecord: {
        figureId: figure.id,
        lat: position.lat,
        lng: position.lng,
        accuracy: position.accuracy,
        distanceToFigure,
        photoUrl: qaPhoto,
        createdAt: Date.now(),
        validationStatus: 'approved',
      },
    })
  }, [camera.isReady, figure, inCaptureRange, phase, position, runObtainAndReward])

  const capture = useCallback(async () => {
    if (capturingRef.current || phaseRef.current !== CAPTURE_PHASES.CAMERA) {
      return
    }

    if (!inCaptureRange || !figure) return

    if (camera.nativeOnly || camera.useNativeFallback) {
      setCaptureError(null)
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
  }, [camera, figure, inCaptureRange, processCanvas, validateDistance])

  const captureFromFile = useCallback(
    async (file) => {
      if (!file || !figure) return
      if (phaseRef.current !== CAPTURE_PHASES.CAMERA) return
      if (capturingRef.current || unlockSubmittedRef.current) return

      const fileKey = getFileKey(file)
      if (lastProcessedFileKeyRef.current === fileKey) return

      if (!inCaptureRange) {
        setCaptureError('Estás lejos del punto. Acercate para capturar.')
        return
      }

      if (!validateDistance()) return

      lastProcessedFileKeyRef.current = fileKey
      capturingRef.current = true
      setCaptureError(null)
      setPhase(CAPTURE_PHASES.CAPTURING)

      cameraLog.nativeFileSelected({
        name: file.name,
        type: file.type,
        size: file.size,
      })
      captureLog.info('native capture started', { figureId: figure.id })
      vibrateCapture()

      try {
        const canvas = await loadImageFromFile(file)
        await processCanvas(canvas)
      } catch (err) {
        if (!unlockSubmittedRef.current) {
          capturingRef.current = false
          lastProcessedFileKeyRef.current = null
          captureLog.warn('native capture failed', err?.message)
          setCaptureError('No pudimos usar esa foto. Reintentá.')
          setPhase(CAPTURE_PHASES.CAMERA)
        }
      }
    },
    [figure, inCaptureRange, processCanvas, validateDistance],
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
    inCaptureRange,
    isApproximateGps,
    isReady,
    gpsAccuracy: position?.accuracy ?? null,
    distanceMeters,
    compressedPhoto,
    captureError,
    capture,
    captureFromFile,
    showRewardComplete,
    complete,
    figure,
  }
}
