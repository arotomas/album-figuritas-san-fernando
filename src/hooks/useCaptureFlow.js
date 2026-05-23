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
  'No pudimos procesar la foto. Probá otra vez.'

function getDistanceToFigure(position, figure) {
  if (!position || !figure) return null
  return getDistanceMeters(position.lat, position.lng, figure.lat, figure.lng)
}

function getFileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function cloneFigure(figure) {
  return figure ? { ...figure } : null
}

function cloneLocationSnapshot(snapshot) {
  if (!snapshot) return null
  return {
    lat: snapshot.lat,
    lng: snapshot.lng,
    accuracy: snapshot.accuracy ?? null,
    distanceToFigure: snapshot.distanceToFigure ?? null,
  }
}

function buildLocationSnapshot(targetFigure, targetPosition, distanceToFigure = null) {
  if (!targetFigure) return null

  if (targetFigure.isQaTest && !targetPosition) {
    return {
      lat: targetFigure.lat,
      lng: targetFigure.lng,
      accuracy: null,
      distanceToFigure: distanceToFigure ?? 0,
    }
  }

  if (!targetPosition) return null

  return {
    lat: targetPosition.lat,
    lng: targetPosition.lng,
    accuracy: targetPosition.accuracy ?? null,
    distanceToFigure:
      distanceToFigure ??
      getDistanceToFigure(targetPosition, targetFigure),
  }
}

function snapshotToPosition(snapshot) {
  if (!snapshot || snapshot.lat == null || snapshot.lng == null) return null
  return {
    lat: snapshot.lat,
    lng: snapshot.lng,
    accuracy: snapshot.accuracy ?? null,
  }
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
 * Orquesta el flujo: proximidad → foto obligatoria → recompensa.
 * Mobile: cámara nativa directa, sin preview web.
 */
export function useCaptureFlow({
  figure,
  position,
  captureSession,
  onObtainFigure,
}) {
  const camera = useCamera()

  const [phase, setPhase] = useState(CAPTURE_PHASES.CAMERA)
  const [compressedPhoto, setCompressedPhoto] = useState(null)
  const [pendingFigure, setPendingFigure] = useState(null)
  const [capturedFigure, setCapturedFigure] = useState(null)
  const [captureError, setCaptureError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const hasVibratedReadyRef = useRef(false)
  const processingRef = useRef(false)
  const phaseRef = useRef(CAPTURE_PHASES.CAMERA)
  const lastProcessedFileKeyRef = useRef(null)
  const unlockSubmittedRef = useRef(false)
  const pendingFigureRef = useRef(null)
  const pendingLocationSnapshotRef = useRef(null)
  const pendingLockedRef = useRef(false)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const activeFigure = pendingFigureRef.current ?? pendingFigure ?? figure

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
    !isProcessing &&
    Boolean(figure)

  const syncPendingState = useCallback((figureSnapshot, locationSnapshot) => {
    pendingFigureRef.current = figureSnapshot
    pendingLocationSnapshotRef.current = cloneLocationSnapshot(locationSnapshot)
    pendingLockedRef.current = true
    setPendingFigure(figureSnapshot)
    setCaptureError(null)
  }, [])

  const lockPendingFromSession = useCallback(
    (sessionFigure, sessionLocationSnapshot, source = 'session') => {
      if (pendingLockedRef.current && pendingFigureRef.current) {
        if (!sessionLocationSnapshot && pendingLocationSnapshotRef.current) {
          return true
        }
        return true
      }

      const snapshot = cloneFigure(sessionFigure)
      if (!snapshot) return false

      const locationSnapshot =
        cloneLocationSnapshot(sessionLocationSnapshot) ??
        buildLocationSnapshot(snapshot, null, snapshot.isQaTest ? 0 : null)

      syncPendingState(snapshot, locationSnapshot)
      captureLog.pendingFigureSet({
        figureId: snapshot.id,
        targetFigureId: snapshot.targetFigureId ?? null,
        source,
        hasLocationSnapshot: Boolean(locationSnapshot),
      })
      return true
    },
    [syncPendingState],
  )

  useEffect(() => {
    if (!captureSession?.figure) return
    lockPendingFromSession(
      captureSession.figure,
      captureSession.locationSnapshot,
      'store',
    )
  }, [
    captureSession?.figure?.id,
    captureSession?.lockedAt,
    captureSession?.locationSnapshot,
    lockPendingFromSession,
  ])

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

  const validateDistanceForOpen = useCallback(
    (targetFigure = figure, targetPosition = position) => {
      if (targetFigure?.isQaTest) {
        return true
      }

      if (!targetPosition || !targetFigure) {
        setCaptureError('Esperá a que el GPS confirme tu ubicación.')
        return false
      }

      const currentDistance = getDistanceToFigure(targetPosition, targetFigure)
      if (currentDistance == null || currentDistance > CAPTURE_MAX_DISTANCE_METERS) {
        captureLog.warn('blocked — too far before camera', {
          figureId: targetFigure.id,
          distanceMeters: currentDistance != null ? Math.round(currentDistance) : null,
        })
        setCaptureError('Estás lejos del punto. Acercate para capturar.')
        return false
      }

      return true
    },
    [figure, position],
  )

  const lockPendingWithValidation = useCallback(
    (targetFigure = figure, targetPosition = position) => {
      if (pendingLockedRef.current && pendingFigureRef.current) {
        return true
      }

      if (!validateDistanceForOpen(targetFigure, targetPosition)) {
        return false
      }

      const snapshot = cloneFigure(targetFigure)
      const locationSnapshot = buildLocationSnapshot(snapshot, targetPosition)
      syncPendingState(snapshot, locationSnapshot)
      captureLog.pendingFigureSet({
        figureId: snapshot.id,
        targetFigureId: snapshot.targetFigureId ?? null,
        source: 'validated',
        hasLocationSnapshot: Boolean(locationSnapshot),
      })
      return true
    },
    [figure, position, syncPendingState, validateDistanceForOpen],
  )

  useEffect(() => {
    if (isReady && !hasVibratedReadyRef.current && !camera.nativeOnly) {
      if (vibrateReady()) {
        hasVibratedReadyRef.current = true
        captureLog.info('ready to capture', { figureId: figure?.id })
      }
    }

    if (!isReady) {
      hasVibratedReadyRef.current = false
    }
  }, [camera.nativeOnly, isReady, figure?.id])

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

  const resolveCaptureLocation = useCallback((figureSnapshot, { afterNativePhoto = false } = {}) => {
    const storedSnapshot =
      pendingLocationSnapshotRef.current ??
      cloneLocationSnapshot(captureSession?.locationSnapshot)

    if (storedSnapshot?.lat != null && storedSnapshot?.lng != null) {
      if (afterNativePhoto) {
        captureLog.usingLocationSnapshot({
          figureId: figureSnapshot?.id,
          distanceToFigure: storedSnapshot.distanceToFigure,
        })
        captureLog.skippingGpsConfirmationAfterPhoto({ figureId: figureSnapshot?.id })
      }
      return storedSnapshot
    }

    if (figureSnapshot?.isQaTest) {
      const qaSnapshot = buildLocationSnapshot(figureSnapshot, null, 0)
      if (afterNativePhoto) {
        captureLog.skippingGpsConfirmationAfterPhoto({
          figureId: figureSnapshot.id,
          reason: 'qa',
        })
      }
      return qaSnapshot
    }

    if (afterNativePhoto && figureSnapshot) {
      captureLog.skippingGpsConfirmationAfterPhoto({
        figureId: figureSnapshot.id,
        reason: 'pending-without-snapshot',
      })
      return buildLocationSnapshot(figureSnapshot, {
        lat: figureSnapshot.lat,
        lng: figureSnapshot.lng,
        accuracy: null,
      })
    }

    return buildLocationSnapshot(figureSnapshot, position)
  }, [captureSession?.locationSnapshot, position])

  const processCanvas = useCallback(
    async (canvas, figureSnapshot, { afterNativePhoto = false } = {}) => {
      if (!figureSnapshot) {
        throw new Error(CAPTURE_RECOVERABLE_ERROR)
      }

      const locationSnapshot = resolveCaptureLocation(figureSnapshot, { afterNativePhoto })
      const capturePosition = snapshotToPosition(locationSnapshot)

      if (!capturePosition) {
        if (afterNativePhoto || pendingFigureRef.current) {
          throw new Error(CAPTURE_RECOVERABLE_ERROR)
        }
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

      const distanceToFigure =
        locationSnapshot?.distanceToFigure ??
        getDistanceToFigure(capturePosition, figureSnapshot)

      const captureRecord = buildCaptureRecord({
        figureId: figureSnapshot.id,
        lat: capturePosition.lat,
        lng: capturePosition.lng,
        accuracy: capturePosition.accuracy,
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
    [resolveCaptureLocation, runObtainAndReward],
  )

  const openNativeCapture = useCallback(() => {
    if (processingRef.current || phaseRef.current !== CAPTURE_PHASES.CAMERA) {
      return false
    }

    const sessionFigure = captureSession?.figure
    const targetFigure = pendingFigureRef.current ?? sessionFigure ?? figure
    if (!targetFigure) return false

    if (pendingLockedRef.current && pendingFigureRef.current) {
      captureLog.nativeInputOpened({ figureId: pendingFigureRef.current.id })
      cameraLog.nativeInputOpen()
      camera.openNativePicker()
      return true
    }

    if (sessionFigure || captureSession?.figure) {
      lockPendingFromSession(
        sessionFigure ?? captureSession.figure,
        captureSession?.locationSnapshot,
        'store',
      )
    } else if (!lockPendingWithValidation(targetFigure, position)) {
      return false
    }

    captureLog.nativeInputOpened({ figureId: pendingFigureRef.current?.id ?? targetFigure.id })
    cameraLog.nativeInputOpen()
    camera.openNativePicker()
    return true
  }, [
    camera,
    captureSession,
    figure,
    lockPendingFromSession,
    lockPendingWithValidation,
    position,
  ])

  const capture = useCallback(async () => {
    if (processingRef.current || phaseRef.current !== CAPTURE_PHASES.CAMERA) {
      return
    }

    if (!figure) return

    if (camera.nativeOnly || camera.useNativeFallback) {
      openNativeCapture()
      return
    }

    if (!lockPendingWithValidation()) return

    const video = camera.getVideoElement?.()
    if (!camera.isReady || !video) return

    const figureSnapshot = pendingFigureRef.current ?? figure
    processingRef.current = true
    setIsProcessing(true)
    setCaptureError(null)
    setPhase(CAPTURE_PHASES.CAPTURING)
    captureLog.processingStart({ figureId: figureSnapshot.id, source: 'video' })
    vibrateCapture()

    try {
      const canvas = captureFrameFromVideo(video)
      await processCanvas(canvas, figureSnapshot)
    } catch (error) {
      handleRecoverableError(error, { figureId: figureSnapshot?.id, source: 'video' })
    }
  }, [
    camera,
    figure,
    handleRecoverableError,
    lockPendingWithValidation,
    openNativeCapture,
    processCanvas,
  ])

  const captureFromFile = useCallback(
    async (file) => {
      try {
        if (!file) return
        if (phaseRef.current !== CAPTURE_PHASES.CAMERA) return
        if (processingRef.current || unlockSubmittedRef.current) return

        const fileKey = getFileKey(file)
        if (lastProcessedFileKeyRef.current === fileKey) return

        const figureSnapshot =
          pendingFigureRef.current ??
          cloneFigure(captureSession?.figure) ??
          cloneFigure(figure)

        if (!figureSnapshot) {
          throw new Error(CAPTURE_RECOVERABLE_ERROR)
        }

        if (pendingFigureRef.current) {
          captureLog.pendingFigureExistsAfterNativePhoto({
            figureId: figureSnapshot.id,
            isQaTest: Boolean(figureSnapshot.isQaTest),
          })
        }

        if (!pendingFigureRef.current) {
          const locationSnapshot =
            cloneLocationSnapshot(captureSession?.locationSnapshot) ??
            buildLocationSnapshot(figureSnapshot, position)
          syncPendingState(figureSnapshot, locationSnapshot)
        }

        captureLog.photoReceived({
          name: file.name,
          type: file.type,
          size: file.size,
          figureId: figureSnapshot.id,
        })
        captureLog.skipDistanceRecheck({ figureId: figureSnapshot.id })
        cameraLog.nativeFileAccepted({
          name: file.name,
          type: file.type,
          size: file.size,
        })

        setCaptureError(null)

        if (!isImageFile(file)) {
          throw new Error(CAPTURE_RECOVERABLE_ERROR)
        }

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
        vibrateCapture()

        const canvas = await loadImageFromFile(file)
        await processCanvas(canvas, figureSnapshot, { afterNativePhoto: true })
      } catch (error) {
        handleRecoverableError(error, {
          figureId: pendingFigureRef.current?.id ?? figure?.id,
          source: 'native',
        })
      }
    },
    [
      captureSession?.figure,
      figure,
      handleRecoverableError,
      position,
      processCanvas,
      syncPendingState,
    ],
  )

  const retryCapture = useCallback(() => {
    if (unlockSubmittedRef.current) return
    resetProcessingState()
    setCaptureError(null)
    setPhase(CAPTURE_PHASES.CAMERA)
    openNativeCapture()
  }, [openNativeCapture, resetProcessingState])

  const clearPendingCapture = useCallback(() => {
    pendingLockedRef.current = false
    pendingFigureRef.current = null
    pendingLocationSnapshotRef.current = null
    setPendingFigure(null)
    lastProcessedFileKeyRef.current = null
  }, [])

  const showRewardComplete = useCallback(() => {
    rewardLog.info('reward complete → unlock')
    vibrateUnlock()
    setPhase(CAPTURE_PHASES.UNLOCK)
  }, [])

  const complete = useCallback(() => {
    rewardLog.info('unlock complete → map')
    clearPendingCapture()
    setPhase(CAPTURE_PHASES.DONE)
  }, [clearPendingCapture])

  const rewardFigure = capturedFigure ?? pendingFigureRef.current ?? pendingFigure ?? figure

  return {
    phase,
    camera,
    gpsProgress,
    inCaptureRange,
    isApproximateGps,
    isReady,
    isProcessing,
    pendingFigure: pendingFigureRef.current ?? pendingFigure,
    gpsAccuracy: position?.accuracy ?? null,
    distanceMeters,
    compressedPhoto,
    captureError,
    rewardFigure,
    capture,
    captureFromFile,
    openNativeCapture,
    retryCapture,
    clearPendingCapture,
    showRewardComplete,
    complete,
    figure: activeFigure,
  }
}
