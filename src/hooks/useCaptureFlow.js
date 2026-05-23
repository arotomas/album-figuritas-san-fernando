import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCamera } from './useCamera'
import { captureFrameFromVideo, isImageFile, loadImageFromFile } from '../utils/camera'
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

export const CAPTURE_RECOVERABLE_ERROR =
  'No pudimos procesar la foto. Probá sacar otra.'

function getDistanceToFigure(position, figure) {
  if (!position || !figure) return null
  return getDistanceMeters(position.lat, position.lng, figure.lat, figure.lng)
}

function getFileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function toProcessingError(error) {
  if (!error?.message) return CAPTURE_RECOVERABLE_ERROR
  if (
    error.message === CAPTURE_RECOVERABLE_ERROR ||
    error.message.startsWith('FILE_') ||
    error.message.startsWith('IMAGE_') ||
    error.message.startsWith('CANVAS_') ||
    error.message.startsWith('COMPRESSION_')
  ) {
    return CAPTURE_RECOVERABLE_ERROR
  }
  return error.message
}

/**
 * Orquesta el flujo: cámara → proximidad flexible → foto obligatoria → recompensa.
 */
export function useCaptureFlow({ figure, position, onObtainFigure }) {
  const camera = useCamera()

  const [phase, setPhase] = useState(CAPTURE_PHASES.CAMERA)
  const [compressedPhoto, setCompressedPhoto] = useState(null)
  const [capturedFigure, setCapturedFigure] = useState(null)
  const [captureError, setCaptureError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const hasVibratedReadyRef = useRef(false)
  const processingRef = useRef(false)
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
    !isProcessing

  const resetProcessingState = useCallback(() => {
    processingRef.current = false
    setIsProcessing(false)
    lastProcessedFileKeyRef.current = null
  }, [])

  const handleRecoverableError = useCallback(
    (error, context = {}) => {
      if (unlockSubmittedRef.current) return

      captureLog.processingError({
        message: error?.message ?? String(error),
        ...context,
      })

      resetProcessingState()
      setCaptureError(toProcessingError(error))
      setPhase(CAPTURE_PHASES.CAMERA)
    },
    [resetProcessingState],
  )

  const clearCaptureError = useCallback(() => {
    setCaptureError(null)
  }, [])

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
    (photoPayload, figureSnapshot) => {
      if (unlockSubmittedRef.current) {
        return true
      }

      if (!photoPayload?.foto || !figureSnapshot) {
        captureLog.warn('blocked — photo or figure missing', { figureId: figureSnapshot?.id })
        handleRecoverableError(new Error(CAPTURE_RECOVERABLE_ERROR))
        return false
      }

      albumLog.info('saving figure', { figureId: figureSnapshot.id })
      const saved = onObtainFigure?.(figureSnapshot.id, photoPayload)

      if (saved === false) {
        captureLog.processingError({ stage: 'obtainFigureWithPhoto', figureId: figureSnapshot.id })
        handleRecoverableError(new Error(CAPTURE_RECOVERABLE_ERROR))
        return false
      }

      unlockSubmittedRef.current = true
      setCaptureError(null)
      setCapturedFigure(figureSnapshot)
      camera.stop()
      setPhase(CAPTURE_PHASES.REWARD)
      captureLog.unlockSuccess({ figureId: figureSnapshot.id })
      rewardLog.info('enter reward phase', { figureId: figureSnapshot.id })
      return true
    },
    [camera, handleRecoverableError, onObtainFigure],
  )

  const processCanvas = useCallback(
    async (canvas, figureSnapshot) => {
      if (!figureSnapshot) {
        throw new Error(CAPTURE_RECOVERABLE_ERROR)
      }

      if (!position) {
        throw new Error('Esperá a que el GPS confirme tu ubicación.')
      }

      if (
        phaseRef.current !== CAPTURE_PHASES.CAMERA &&
        phaseRef.current !== CAPTURE_PHASES.CAPTURING &&
        phaseRef.current !== CAPTURE_PHASES.COMPRESSING
      ) {
        return false
      }

      setCaptureError(null)
      setPhase(CAPTURE_PHASES.COMPRESSING)
      captureLog.processingStart({ figureId: figureSnapshot.id })

      const compressed = await compressImage(canvas, {
        maxWidth: 960,
        quality: 0.68,
      })

      if (!compressed?.dataUrl) {
        throw new Error(CAPTURE_RECOVERABLE_ERROR)
      }

      captureLog.compressionSuccess({
        figureId: figureSnapshot.id,
        bytes: compressed.sizeBytes,
        width: compressed.width,
        height: compressed.height,
      })

      setCompressedPhoto(compressed.dataUrl)

      const distanceToFigure = getDistanceToFigure(position, figureSnapshot)
      const captureRecord = buildCaptureRecord({
        figureId: figureSnapshot.id,
        lat: position.lat,
        lng: position.lng,
        accuracy: position.accuracy,
        distanceToFigure,
        photoUrl: compressed.dataUrl,
        createdAt: Date.now(),
      })

      const validatedCapture = await processCaptureForUnlock(captureRecord)

      return runObtainAndReward(
        {
          foto: compressed.dataUrl,
          fotoSizeBytes: compressed.sizeBytes,
          obtenidaEn: Date.now(),
          captureRecord: validatedCapture,
        },
        figureSnapshot,
      )
    },
    [position, runObtainAndReward],
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

    runObtainAndReward(
      {
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
      },
      figure,
    )
  }, [camera.isReady, figure, inCaptureRange, phase, position, runObtainAndReward])

  const capture = useCallback(async () => {
    if (processingRef.current || phaseRef.current !== CAPTURE_PHASES.CAMERA) {
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

    processingRef.current = true
    setIsProcessing(true)
    setCaptureError(null)
    setPhase(CAPTURE_PHASES.CAPTURING)
    captureLog.processingStart({ figureId: figure.id, source: 'video' })
    vibrateCapture()

    try {
      const canvas = captureFrameFromVideo(video)
      await processCanvas(canvas, figure)
    } catch (error) {
      handleRecoverableError(error, { figureId: figure.id, source: 'video' })
    }
  }, [camera, figure, handleRecoverableError, inCaptureRange, processCanvas, validateDistance])

  const captureFromFile = useCallback(
    async (file) => {
      try {
        if (!file) return
        if (!figure) return
        if (phaseRef.current !== CAPTURE_PHASES.CAMERA) return
        if (processingRef.current || unlockSubmittedRef.current) return

        const fileKey = getFileKey(file)
        if (lastProcessedFileKeyRef.current === fileKey) return

        setCaptureError(null)

        if (!isImageFile(file)) {
          throw new Error(CAPTURE_RECOVERABLE_ERROR)
        }

        if (!inCaptureRange) {
          setCaptureError('Estás lejos del punto. Acercate para capturar.')
          return
        }

        if (!validateDistance()) return

        lastProcessedFileKeyRef.current = fileKey
        processingRef.current = true
        setIsProcessing(true)
        setPhase(CAPTURE_PHASES.CAPTURING)

        captureLog.fileSelected({
          name: file.name,
          type: file.type,
          size: file.size,
        })
        cameraLog.nativeFileSelected({
          name: file.name,
          type: file.type,
          size: file.size,
        })
        captureLog.processingStart({ figureId: figure.id, source: 'native' })
        vibrateCapture()

        const figureSnapshot = { ...figure }
        const canvas = await loadImageFromFile(file)
        await processCanvas(canvas, figureSnapshot)
      } catch (error) {
        handleRecoverableError(error, {
          figureId: figure?.id,
          source: 'native',
        })
      }
    },
    [figure, handleRecoverableError, inCaptureRange, processCanvas, validateDistance],
  )

  const retryCapture = useCallback(() => {
    if (unlockSubmittedRef.current) return
    resetProcessingState()
    setCaptureError(null)
    setPhase(CAPTURE_PHASES.CAMERA)
    camera.openNativePicker()
  }, [camera, resetProcessingState])

  const showRewardComplete = useCallback(() => {
    rewardLog.info('reward complete → unlock')
    vibrateUnlock()
    setPhase(CAPTURE_PHASES.UNLOCK)
  }, [])

  const complete = useCallback(() => {
    rewardLog.info('unlock complete → map')
    setPhase(CAPTURE_PHASES.DONE)
  }, [])

  const rewardFigure = capturedFigure ?? figure

  return {
    phase,
    camera,
    gpsProgress,
    inCaptureRange,
    isApproximateGps,
    isReady,
    isProcessing,
    gpsAccuracy: position?.accuracy ?? null,
    distanceMeters,
    compressedPhoto,
    captureError,
    rewardFigure,
    capture,
    captureFromFile,
    retryCapture,
    clearCaptureError,
    showRewardComplete,
    complete,
    figure,
  }
}
