import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useCamera } from './useCamera'
import { captureFrameFromVideo } from '../utils/camera'
import {
  prepareNativeCapturePhoto,
  QA_PLACEHOLDER_JPEG,
} from '../utils/nativePhotoPrepare'
import { compressImageWithFallback } from '../utils/imageCompression'
import { withTimeout } from '../utils/withTimeout'
import { vibrateCapture, vibrateReady, vibrateUnlock, vibrateProximityPulse } from '../utils/vibration'
import { getDistanceMeters } from '../utils/geo'
import { GPS_APPROXIMATE_CAPTURE_WARNING_M } from '../config/gps'
import {
  buildProximitySnapshot,
  getProximityRadii,
  isWithinCaptureRange,
} from '../utils/proximityExperience'
import { useSmoothedProximityVisual } from './useSmoothedProximity'
import { VIBRATION_PROXIMITY_PULSE_COOLDOWN_MS } from '../config/ux'
import {
  buildCaptureRecord,
  processCaptureForUnlock,
  CAPTURE_VALIDATION_STATUS,
} from '../services/captureService'
import { useMobilePhotoDebugStore } from '../store/useMobilePhotoDebugStore'
import { getQaState, setQaFlag } from '../utils/diagnostics'
import { cameraLog } from '../utils/cameraLog'
import { captureLog, albumLog, rewardLog } from '../utils/devLog'
import { mobilePhotoLog } from '../utils/mobilePhotoLog'
import { hasCaptureChallenge } from '../utils/figureChallenges'

export const CAPTURE_PHASES = {
  CHALLENGE: 'challenge',
  CAMERA: 'camera',
  CAPTURING: 'capturing',
  COMPRESSING: 'compressing',
  REWARD: 'reward',
  UNLOCK: 'unlock',
  PHOTO_UPDATED: 'photo_updated',
  DONE: 'done',
}

export const CAPTURE_RECOVERABLE_ERROR =
  'No pudimos procesar la foto. Probá otra vez.'

export const MOBILE_PHOTO_RECOVERABLE_ERROR =
  'No pudimos procesar la foto del celular. Probá otra vez.'

export const CAPTURE_TIMEOUT_ERROR =
  'La foto tardó demasiado en procesarse. Probá otra vez.'

const PROCESSING_TIMEOUT_MS = 15_000
const LOAD_IMAGE_TIMEOUT_MS = 12_000
const UNLOCK_TIMEOUT_MS = 5_000

function getDistanceToFigure(position, figure) {
  if (!position || !figure) return null
  return getDistanceMeters(position.lat, position.lng, figure.lat, figure.lng)
}

function getFileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function isAcceptableMobilePhotoFile(file) {
  if (!file || file.size <= 0) return false
  if (!file.type) return true
  if (file.type.startsWith('image/')) return true
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name ?? '')
}

function publishMobilePhotoDebug(snapshot) {
  useMobilePhotoDebugStore.getState().setSnapshot(snapshot)
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
    error.message === MOBILE_PHOTO_RECOVERABLE_ERROR ||
    error.message === CAPTURE_TIMEOUT_ERROR
  ) {
    return error.message
  }
  if (
    error.message.endsWith('_TIMEOUT') ||
    error.message.startsWith('FILE_') ||
    error.message.startsWith('IMAGE_') ||
    error.message.startsWith('CANVAS_') ||
    error.message.startsWith('COMPRESSION_') ||
    error.message.startsWith('BLOB_')
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
  onReplacePhoto,
  captureMode = 'unlock',
}) {
  const camera = useCamera()
  const isRetake = captureMode === 'retake'

  const [phase, setPhase] = useState(() =>
    hasCaptureChallenge(figure) ? CAPTURE_PHASES.CHALLENGE : CAPTURE_PHASES.CAMERA,
  )
  const [compressedPhoto, setCompressedPhoto] = useState(null)
  const [pendingFigure, setPendingFigure] = useState(null)
  const [capturedFigure, setCapturedFigure] = useState(null)
  const [captureError, setCaptureError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingMessage, setProcessingMessage] = useState(null)

  const hasVibratedReadyRef = useRef(false)
  const processingRef = useRef(false)
  const processingTimeoutRef = useRef(null)
  const phaseRef = useRef(CAPTURE_PHASES.CAMERA)
  const lastProcessedFileKeyRef = useRef(null)
  const unlockSubmittedRef = useRef(false)
  const pendingFigureRef = useRef(null)
  const pendingLocationSnapshotRef = useRef(null)
  const pendingLockedRef = useRef(false)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (hasCaptureChallenge(figure)) {
      setPhase(CAPTURE_PHASES.CHALLENGE)
      phaseRef.current = CAPTURE_PHASES.CHALLENGE
      unlockSubmittedRef.current = false
      return
    }
    setPhase(CAPTURE_PHASES.CAMERA)
    phaseRef.current = CAPTURE_PHASES.CAMERA
  }, [figure?.id, captureSession?.lockedAt])

  const resolvedFigure = figure ?? captureSession?.figure ?? null
  const sessionSnapshot = captureSession?.locationSnapshot ?? null
  const sessionDistance = sessionSnapshot?.distanceToFigure ?? null

  const effectivePosition = useMemo(() => {
    if (position) return position
    return snapshotToPosition(sessionSnapshot)
  }, [position, sessionSnapshot])

  const activeFigure = pendingFigureRef.current ?? pendingFigure ?? resolvedFigure

  const distanceMeters = useMemo(() => {
    if (effectivePosition && resolvedFigure) {
      return getDistanceToFigure(effectivePosition, resolvedFigure)
    }
    if (sessionDistance != null) return sessionDistance
    return null
  }, [effectivePosition, resolvedFigure, sessionDistance])

  const proximitySnapshot = useMemo(
    () => buildProximitySnapshot(resolvedFigure, distanceMeters),
    [distanceMeters, resolvedFigure],
  )

  const captureRadiusMeters =
    proximitySnapshot?.captureMeters ?? getProximityRadii(resolvedFigure).captureMeters
  const detectionRadiusMeters =
    proximitySnapshot?.detectionMeters ?? getProximityRadii(resolvedFigure).detectionMeters

  const sessionInCaptureRange = useMemo(() => {
    if (isRetake || !resolvedFigure || sessionDistance == null) return false
    return isWithinCaptureRange(sessionDistance, getProximityRadii(resolvedFigure).captureMeters)
  }, [isRetake, resolvedFigure, sessionDistance])

  const inCaptureRange =
    isRetake ||
    Boolean(proximitySnapshot?.inCaptureRange) ||
    sessionInCaptureRange

  const inDetectionRange =
    isRetake ||
    Boolean(proximitySnapshot?.inDetectionRange) ||
    sessionInCaptureRange

  const rawRingProgress =
    proximitySnapshot?.easedProgress ?? (sessionInCaptureRange ? 1 : 0)
  const visualProgress = useSmoothedProximityVisual(rawRingProgress, {
    enabled: Boolean(resolvedFigure) && inDetectionRange && !isRetake,
  })

  const proximityPhase =
    sessionInCaptureRange && proximitySnapshot?.phase === 'none'
      ? 'capture'
      : (proximitySnapshot?.phase ?? 'none')
  const figureRarity = proximitySnapshot?.rarity ?? 'común'

  const isApproximateGps =
    effectivePosition?.accuracy != null &&
    effectivePosition.accuracy > GPS_APPROXIMATE_CAPTURE_WARNING_M

  const gpsProgress = inDetectionRange ? visualProgress : 0

  const isReady =
    camera.isReady &&
    inCaptureRange &&
    phase === CAPTURE_PHASES.CAMERA &&
    !isProcessing &&
    Boolean(resolvedFigure)

  const lastPulsePhaseRef = useRef(null)

  useEffect(() => {
    if (isRetake || !inDetectionRange || inCaptureRange) return
    if (lastPulsePhaseRef.current === proximityPhase) return
    if (vibrateProximityPulse(proximityPhase, VIBRATION_PROXIMITY_PULSE_COOLDOWN_MS)) {
      lastPulsePhaseRef.current = proximityPhase
    }
  }, [inCaptureRange, inDetectionRange, isRetake, proximityPhase])

  const acknowledgeChallenge = useCallback(() => {
    setPhase(CAPTURE_PHASES.CAMERA)
    phaseRef.current = CAPTURE_PHASES.CAMERA
  }, [])

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

  useLayoutEffect(() => {
    if (!captureSession?.figure) return
    lockPendingFromSession(
      captureSession.figure,
      captureSession.locationSnapshot,
      'store',
    )
    captureLog.info('capture bootstrap — session locked', {
      figureId: captureSession.figure.id,
      hasLocationSnapshot: Boolean(captureSession.locationSnapshot),
      sessionDistanceMeters:
        captureSession.locationSnapshot?.distanceToFigure != null
          ? Math.round(captureSession.locationSnapshot.distanceToFigure)
          : null,
      lockedAt: captureSession.lockedAt,
    })
  }, [
    captureSession?.figure?.id,
    captureSession?.lockedAt,
    captureSession?.locationSnapshot,
    lockPendingFromSession,
  ])

  const resetProcessingState = useCallback(() => {
    if (processingTimeoutRef.current) {
      window.clearTimeout(processingTimeoutRef.current)
      processingTimeoutRef.current = null
    }
    processingRef.current = false
    setIsProcessing(false)
    setProcessingMessage(null)
    lastProcessedFileKeyRef.current = null
  }, [])

  const stopProcessingUi = useCallback(() => {
    if (processingTimeoutRef.current) {
      window.clearTimeout(processingTimeoutRef.current)
      processingTimeoutRef.current = null
    }
    processingRef.current = false
    setIsProcessing(false)
    setProcessingMessage(null)
    if (!unlockSubmittedRef.current && phaseRef.current !== CAPTURE_PHASES.CAMERA) {
      phaseRef.current = CAPTURE_PHASES.CAMERA
      setPhase(CAPTURE_PHASES.CAMERA)
    }
  }, [])

  const startProcessingGuard = useCallback(
    (onTimeout) => {
      processingRef.current = true
      setIsProcessing(true)
      setProcessingMessage('Procesando foto…')
      setCaptureError(null)

      if (processingTimeoutRef.current) {
        window.clearTimeout(processingTimeoutRef.current)
      }

      processingTimeoutRef.current = window.setTimeout(() => {
        if (!processingRef.current || unlockSubmittedRef.current) return
        captureLog.timeout({ afterMs: PROCESSING_TIMEOUT_MS })
        onTimeout(new Error(CAPTURE_TIMEOUT_ERROR))
      }, PROCESSING_TIMEOUT_MS)
    },
    [],
  )

  const handleRecoverableError = useCallback(
    (error, context = {}) => {
      if (unlockSubmittedRef.current) return

      captureLog.processingError({
        message: error?.message ?? String(error),
        ...context,
      })

      resetProcessingState()
      setCaptureError(toProcessingError(error))
      phaseRef.current = CAPTURE_PHASES.CAMERA
      setPhase(CAPTURE_PHASES.CAMERA)
    },
    [resetProcessingState],
  )

  const validateDistanceForOpen = useCallback(
    (targetFigure = resolvedFigure, targetPosition = effectivePosition) => {
      if (isRetake || targetFigure?.isQaTest) {
        return true
      }

      const captureRadius = getProximityRadii(targetFigure).captureMeters
      const trustedSnapshot =
        pendingLocationSnapshotRef.current ?? captureSession?.locationSnapshot ?? null
      const snapshotDistance =
        trustedSnapshot?.distanceToFigure ??
        (trustedSnapshot && targetFigure
          ? getDistanceToFigure(snapshotToPosition(trustedSnapshot), targetFigure)
          : null)

      if (
        snapshotDistance != null &&
        isWithinCaptureRange(snapshotDistance, captureRadius)
      ) {
        captureLog.usingLocationSnapshot({
          figureId: targetFigure?.id,
          distanceMeters: Math.round(snapshotDistance),
          captureRadiusMeters: captureRadius,
        })
        return true
      }

      if (!targetPosition || !targetFigure) {
        captureLog.warn('blocked — waiting for gps before camera', {
          figureId: targetFigure?.id ?? null,
          hasSessionSnapshot: Boolean(trustedSnapshot),
        })
        setCaptureError('Esperá a que el GPS confirme tu ubicación.')
        return false
      }

      const currentDistance = getDistanceToFigure(targetPosition, targetFigure)
      if (currentDistance == null || !isWithinCaptureRange(currentDistance, captureRadius)) {
        captureLog.warn('blocked — too far before camera', {
          figureId: targetFigure.id,
          distanceMeters: currentDistance != null ? Math.round(currentDistance) : null,
          captureRadiusMeters: captureRadius,
        })
        setCaptureError('Todavía no estás lo suficientemente cerca. Seguí la señal del aro.')
        return false
      }

      return true
    },
    [captureSession?.locationSnapshot, effectivePosition, isRetake, resolvedFigure],
  )

  const lockPendingWithValidation = useCallback(
    (targetFigure = resolvedFigure, targetPosition = effectivePosition) => {
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
    [resolvedFigure, effectivePosition, syncPendingState, validateDistanceForOpen],
  )

  useEffect(() => {
    if (isReady && !hasVibratedReadyRef.current && !camera.nativeOnly) {
      if (vibrateReady()) {
        hasVibratedReadyRef.current = true
        captureLog.info('ready to capture', { figureId: resolvedFigure?.id })
      }
    }

    if (!isReady) {
      hasVibratedReadyRef.current = false
    }
  }, [camera.nativeOnly, isReady, resolvedFigure?.id])

  const runObtainAndReward = useCallback(
    async (photoPayload, figureSnapshot) => {
      if (unlockSubmittedRef.current) {
        return true
      }

      if (!photoPayload?.foto || !figureSnapshot) {
        captureLog.warn('blocked — photo or figure missing', { figureId: figureSnapshot?.id })
        handleRecoverableError(new Error(CAPTURE_RECOVERABLE_ERROR))
        return false
      }

      const isMobilePhoto = photoPayload.photoSource === 'mobile-native'
      unlockSubmittedRef.current = true
      setCaptureError(null)

      if (isMobilePhoto) {
        setProcessingMessage(isRetake ? 'Actualizando foto…' : 'Guardando foto…')
      }

      if (isRetake) {
        captureLog.info('photo replace start', { figureId: figureSnapshot.id })
        const saved = await onReplacePhoto?.(figureSnapshot.id, photoPayload)

        if (saved === false) {
          unlockSubmittedRef.current = false
          processingRef.current = false
          setIsProcessing(false)
          setProcessingMessage(null)
          phaseRef.current = CAPTURE_PHASES.CAMERA
          setPhase(CAPTURE_PHASES.CAMERA)
          handleRecoverableError(
            new Error(isMobilePhoto ? MOBILE_PHOTO_RECOVERABLE_ERROR : CAPTURE_RECOVERABLE_ERROR),
          )
          return false
        }

        setCapturedFigure(figureSnapshot)
        setPhase(CAPTURE_PHASES.PHOTO_UPDATED)
        phaseRef.current = CAPTURE_PHASES.PHOTO_UPDATED
        camera.stop()
        return true
      }

      captureLog.unlockStart({
        figureId: figureSnapshot.id,
        isQaTest: Boolean(figureSnapshot.isQaTest),
      })
      albumLog.info('saving figure', { figureId: figureSnapshot.id })

      const saved = await onObtainFigure?.(figureSnapshot.id, photoPayload)

      if (saved === false) {
        unlockSubmittedRef.current = false
        processingRef.current = false
        setIsProcessing(false)
        setProcessingMessage(null)
        phaseRef.current = CAPTURE_PHASES.CAMERA
        setPhase(CAPTURE_PHASES.CAMERA)
        captureLog.processingError({ stage: 'obtainFigureWithPhoto', figureId: figureSnapshot.id })
        handleRecoverableError(
          new Error(isMobilePhoto ? MOBILE_PHOTO_RECOVERABLE_ERROR : CAPTURE_RECOVERABLE_ERROR),
        )
        return false
      }

      setCapturedFigure(figureSnapshot)
      setPhase(CAPTURE_PHASES.REWARD)
      phaseRef.current = CAPTURE_PHASES.REWARD
      camera.stop()
      captureLog.unlockSuccess({ figureId: figureSnapshot.id })
      rewardLog.info('enter reward phase', { figureId: figureSnapshot.id })
      return true
    },
    [camera, handleRecoverableError, isRetake, onObtainFigure, onReplacePhoto],
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

    if (isRetake && position) {
      return buildLocationSnapshot(figureSnapshot, position)
    }

    if (isRetake && figureSnapshot?.lat != null && figureSnapshot?.lng != null) {
      return buildLocationSnapshot(figureSnapshot, {
        lat: figureSnapshot.lat,
        lng: figureSnapshot.lng,
        accuracy: null,
      })
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
  }, [captureSession?.locationSnapshot, isRetake, position])

  const finalizeUnlock = useCallback(
    async (compressed, figureSnapshot, locationSnapshot, capturePosition) => {
      if (!compressed?.dataUrl) {
        throw new Error(CAPTURE_RECOVERABLE_ERROR)
      }

      captureLog.compressSuccess({
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

      let validatedCapture
      if (figureSnapshot.isQaTest) {
        validatedCapture = {
          ...captureRecord,
          validationStatus: CAPTURE_VALIDATION_STATUS.APPROVED,
        }
      } else {
        validatedCapture = await withTimeout(
          processCaptureForUnlock(captureRecord),
          UNLOCK_TIMEOUT_MS,
          'processCaptureForUnlock',
        )
      }

      const unlocked = await runObtainAndReward(
        {
          foto: compressed.dataUrl,
          fotoSizeBytes: compressed.sizeBytes,
          photoSource: compressed.photoSource ?? null,
          compressedBlobSize: compressed.blob?.size ?? compressed.sizeBytes,
          compressedBlobType: compressed.blob?.type ?? compressed.type ?? null,
          obtenidaEn: Date.now(),
          captureRecord: validatedCapture,
        },
        figureSnapshot,
      )

      if (unlocked) {
        captureLog.finished({ figureId: figureSnapshot.id })
      }

      return unlocked
    },
    [runObtainAndReward],
  )

  const processCanvas = useCallback(
    async (canvas, figureSnapshot, { afterNativePhoto = false, sourceFile = null } = {}) => {
      if (!figureSnapshot) {
        throw new Error(CAPTURE_RECOVERABLE_ERROR)
      }

      const locationSnapshot = resolveCaptureLocation(figureSnapshot, { afterNativePhoto })
      const capturePosition = snapshotToPosition(locationSnapshot)

      if (!capturePosition) {
        if (afterNativePhoto || pendingFigureRef.current || figureSnapshot.isQaTest) {
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

      captureLog.compressStart({ figureId: figureSnapshot.id })

      let compressed
      try {
        compressed = await compressImageWithFallback(canvas, {
          maxWidth: 960,
          quality: 0.68,
        })
      } catch (compressError) {
        if (figureSnapshot.isQaTest) {
          captureLog.warn('QA compress fallback — placeholder jpeg', {
            figureId: figureSnapshot.id,
          })
          compressed = {
            dataUrl: QA_PLACEHOLDER_JPEG,
            sizeBytes: Math.max(1, Math.round(QA_PLACEHOLDER_JPEG.length * 0.75)),
            width: 1,
            height: 1,
          }
        } else {
          throw compressError
        }
      }

      return finalizeUnlock(compressed, figureSnapshot, locationSnapshot, capturePosition)
    },
    [finalizeUnlock, resolveCaptureLocation],
  )

  const processNativePhoto = useCallback(
    async (file, figureSnapshot) => {
      mobilePhotoLog.info('file received', {
        name: file?.name ?? null,
        type: file?.type ?? '',
        size: file?.size ?? 0,
        lastModified: file?.lastModified ?? null,
      })
      publishMobilePhotoDebug({
        status: 'file-received',
        fileName: file?.name ?? null,
        fileType: file?.type ?? '',
        fileSize: file?.size ?? 0,
        lastModified: file?.lastModified ?? null,
        figureId: figureSnapshot.id,
      })

      if (!isAcceptableMobilePhotoFile(file)) {
        mobilePhotoLog.error('invalid mobile file', {
          name: file?.name ?? null,
          type: file?.type ?? '',
          size: file?.size ?? 0,
        })
        publishMobilePhotoDebug({
          status: 'error',
          uploadStatus: 'not-started',
          uploadError: 'MOBILE_INVALID_FILE',
          fileName: file?.name ?? null,
          fileType: file?.type ?? '',
          fileSize: file?.size ?? 0,
          figureId: figureSnapshot.id,
        })
        throw new Error(MOBILE_PHOTO_RECOVERABLE_ERROR)
      }

      captureLog.fileReceived({
        name: file.name,
        type: file.type,
        size: file.size,
        figureId: figureSnapshot.id,
      })

      const locationSnapshot = resolveCaptureLocation(figureSnapshot, { afterNativePhoto: true })
      const capturePosition = snapshotToPosition(locationSnapshot)
      if (!capturePosition) {
        throw new Error(CAPTURE_RECOVERABLE_ERROR)
      }

      setPhase(CAPTURE_PHASES.COMPRESSING)
      phaseRef.current = CAPTURE_PHASES.COMPRESSING

      captureLog.loadImageStart({ figureId: figureSnapshot.id })
      captureLog.compressStart({ figureId: figureSnapshot.id, mode: 'native-resize' })

      let compressed
      try {
        compressed = await withTimeout(
          prepareNativeCapturePhoto(file, { isQaTest: Boolean(figureSnapshot.isQaTest) }),
          LOAD_IMAGE_TIMEOUT_MS,
          'prepareNativeCapturePhoto',
        )
        if (
          !compressed?.dataUrl?.startsWith('data:image/jpeg') ||
          (compressed.blob && compressed.blob.type !== 'image/jpeg') ||
          compressed.sizeBytes <= 0
        ) {
          throw new Error('MOBILE_INVALID_COMPRESSED_JPEG')
        }
        compressed = {
          ...compressed,
          photoSource: 'mobile-native',
        }
        mobilePhotoLog.info('jpeg ready', {
          size: compressed.blob?.size ?? compressed.sizeBytes,
          type: compressed.blob?.type ?? compressed.type ?? null,
        })
        publishMobilePhotoDebug({
          status: 'compressed',
          uploadStatus: 'pending',
          fileName: file.name ?? null,
          fileType: file.type ?? '',
          fileSize: file.size,
          compressedBlobSize: compressed.blob?.size ?? compressed.sizeBytes,
          compressedBlobType: compressed.blob?.type ?? compressed.type ?? null,
          figureId: figureSnapshot.id,
        })
        captureLog.loadImageSuccess({
          figureId: figureSnapshot.id,
          width: compressed.width,
          height: compressed.height,
        })
      } catch (prepareError) {
        mobilePhotoLog.error('prepare failed', {
          figureId: figureSnapshot.id,
          message: prepareError?.message ?? String(prepareError),
        })
        publishMobilePhotoDebug({
          status: 'error',
          uploadStatus: 'not-started',
          uploadError: prepareError?.message ?? 'MOBILE_PREPARE_FAILED',
          fileName: file.name ?? null,
          fileType: file.type ?? '',
          fileSize: file.size,
          figureId: figureSnapshot.id,
        })
        throw new Error(MOBILE_PHOTO_RECOVERABLE_ERROR)
      }

      return finalizeUnlock(compressed, figureSnapshot, locationSnapshot, capturePosition)
    },
    [finalizeUnlock, resolveCaptureLocation],
  )

  const openNativeCapture = useCallback(() => {
    if (processingRef.current || phaseRef.current !== CAPTURE_PHASES.CAMERA) {
      return false
    }

    const sessionFigure = captureSession?.figure
    const targetFigure = pendingFigureRef.current ?? sessionFigure ?? resolvedFigure
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
    } else if (!lockPendingWithValidation(targetFigure, effectivePosition)) {
      captureLog.warn('native open blocked — validation failed', {
        figureId: targetFigure?.id ?? null,
      })
      return false
    }

    captureLog.nativeInputOpened({ figureId: pendingFigureRef.current?.id ?? targetFigure.id })
    cameraLog.nativeInputOpen()
    camera.openNativePicker()
    return true
  }, [
    camera,
    captureSession,
    effectivePosition,
    lockPendingFromSession,
    lockPendingWithValidation,
    resolvedFigure,
  ])

  const capture = useCallback(async () => {
    if (processingRef.current || phaseRef.current !== CAPTURE_PHASES.CAMERA) {
      return
    }

    if (!resolvedFigure) return

    if (camera.nativeOnly || camera.useNativeFallback) {
      openNativeCapture()
      return
    }

    if (!lockPendingWithValidation()) return

    const video = camera.getVideoElement?.()
    if (!camera.isReady || !video) return

    const figureSnapshot = pendingFigureRef.current ?? resolvedFigure
    setPhase(CAPTURE_PHASES.CAPTURING)
    captureLog.processingStart({ figureId: figureSnapshot.id, source: 'video' })
    vibrateCapture()

    startProcessingGuard((timeoutError) => {
      handleRecoverableError(timeoutError, { figureId: figureSnapshot?.id, source: 'timeout' })
    })

    try {
      const canvas = captureFrameFromVideo(video)
      await processCanvas(canvas, figureSnapshot)
    } catch (error) {
      if (!unlockSubmittedRef.current) {
        handleRecoverableError(error, { figureId: figureSnapshot?.id, source: 'video' })
      }
    } finally {
      stopProcessingUi()
    }
  }, [
    camera,
    resolvedFigure,
    handleRecoverableError,
    lockPendingWithValidation,
    openNativeCapture,
    processCanvas,
    startProcessingGuard,
    stopProcessingUi,
  ])

  const captureFromFile = useCallback(
    async (file) => {
      if (!file) return
      if (
        phaseRef.current !== CAPTURE_PHASES.CAMERA &&
        phaseRef.current !== CAPTURE_PHASES.CAPTURING &&
        phaseRef.current !== CAPTURE_PHASES.COMPRESSING
      ) {
        return
      }
      if (processingRef.current || unlockSubmittedRef.current) return

      const fileKey = getFileKey(file)
      if (lastProcessedFileKeyRef.current === fileKey) return

      const figureSnapshot =
        pendingFigureRef.current ??
        cloneFigure(captureSession?.figure) ??
        cloneFigure(resolvedFigure)

      if (!figureSnapshot) {
        handleRecoverableError(new Error(CAPTURE_RECOVERABLE_ERROR), { source: 'native' })
        return
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
          buildLocationSnapshot(figureSnapshot, effectivePosition)
        syncPendingState(figureSnapshot, locationSnapshot)
      }

      captureLog.skipDistanceRecheck({ figureId: figureSnapshot.id })
      cameraLog.nativeFileAccepted({
        name: file.name,
        type: file.type,
        size: file.size,
      })

      mobilePhotoLog.info('file received', {
        name: file.name ?? null,
        type: file.type ?? '',
        size: file.size,
        lastModified: file.lastModified ?? null,
      })

      if (!isAcceptableMobilePhotoFile(file)) {
        handleRecoverableError(new Error(MOBILE_PHOTO_RECOVERABLE_ERROR), {
          figureId: figureSnapshot.id,
          source: 'native',
        })
        return
      }

      lastProcessedFileKeyRef.current = fileKey
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

      startProcessingGuard((timeoutError) => {
        handleRecoverableError(timeoutError, {
          figureId: figureSnapshot.id,
          source: 'timeout',
        })
      })

      try {
        await processNativePhoto(file, figureSnapshot)
      } catch (error) {
        if (!unlockSubmittedRef.current) {
          handleRecoverableError(error, {
            figureId: figureSnapshot.id,
            source: 'native',
          })
        }
      } finally {
        stopProcessingUi()
      }
    },
    [
      captureSession?.figure,
      captureSession?.locationSnapshot,
      effectivePosition,
      handleRecoverableError,
      resolvedFigure,
      processNativePhoto,
      startProcessingGuard,
      stopProcessingUi,
      syncPendingState,
    ],
  )

  const retryCapture = useCallback(() => {
    if (unlockSubmittedRef.current) return
    resetProcessingState()
    setCaptureError(null)
    setPhase(CAPTURE_PHASES.CAMERA)
    captureLog.info('capture retry', {
      nativeOnly: camera.nativeOnly,
      useNativeFallback: camera.useNativeFallback,
      figureId: resolvedFigure?.id ?? null,
    })
    if (camera.nativeOnly || camera.useNativeFallback) {
      openNativeCapture()
      return
    }
    camera.initPermission()
  }, [camera, openNativeCapture, resetProcessingState, resolvedFigure?.id])

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

  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        window.clearTimeout(processingTimeoutRef.current)
      }
    }
  }, [])

  const rewardFigure = capturedFigure ?? pendingFigureRef.current ?? pendingFigure ?? resolvedFigure

  return {
    phase,
    camera,
    gpsProgress,
    visualProgress,
    proximityPhase,
    figureRarity,
    inDetectionRange,
    detectionRadiusMeters,
    captureRadiusMeters,
    inCaptureRange,
    isApproximateGps,
    isReady,
    isProcessing,
    processingMessage,
    pendingFigure: pendingFigureRef.current ?? pendingFigure,
    gpsAccuracy: effectivePosition?.accuracy ?? null,
    distanceMeters,
    compressedPhoto,
    captureError,
    rewardFigure,
    capture,
    captureFromFile,
    openNativeCapture,
    acknowledgeChallenge,
    retryCapture,
    clearPendingCapture,
    showRewardComplete,
    complete,
    figure: activeFigure,
  }
}
