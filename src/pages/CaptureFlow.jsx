import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { CameraView } from '../components/camera'
import { NativeCapturePanel } from '../components/camera/NativeCapturePanel'
import { CameraAccessGate } from '../components/camera/CameraAccessGate'
import { PermissionFallback } from '../components/qa/PermissionFallback'
import { useGeolocation } from '../hooks/useGeolocation'
import { useCaptureFlow, CAPTURE_PHASES } from '../hooks/useCaptureFlow'
import { CaptureChallengeInterstitial } from '../components/camera/CaptureChallengeInterstitial'
import { useAppLifecycle } from '../hooks/useAppLifecycle'
import { useAppStore } from '../store/useAppStore'
import { stopVibration } from '../utils/vibration'
import { PERMISSION_RETRY_DELAY_MS } from '../config/ux'
import { delay } from '../utils/recovery'
import { isNativeCameraOnly } from '../utils/device'
import { useQaMode } from '../utils/qaMode'
import { captureSyncLog } from '../utils/captureSyncLog'

const RewardAnimation = lazy(() =>
  import('../components/reward/RewardAnimation').then((m) => ({
    default: m.RewardAnimation,
  })),
)

const UnlockAnimation = lazy(() =>
  import('../components/reward/UnlockAnimation').then((m) => ({
    default: m.UnlockAnimation,
  })),
)

const PhotoUpdatedAnimation = lazy(() =>
  import('../components/reward/PhotoUpdatedAnimation').then((m) => ({
    default: m.PhotoUpdatedAnimation,
  })),
)

function RewardSkeleton() {
  return (
    <div className="safe-top safe-bottom flex h-full items-center justify-center bg-zinc-950">
      <div className="map-skeleton-pulse h-64 w-48 rounded-2xl bg-zinc-800" />
    </div>
  )
}

export function CaptureFlow() {
  const navigate = useNavigate()
  const { withQa } = useQaMode()
  const isMobileNative = isNativeCameraOnly()
  const nearFigure = useAppStore((state) => state.nearFigure)
  const captureSession = useAppStore((state) => state.captureSession)
  const figures = useAppStore((state) => state.figures)
  const setNearFigure = useAppStore((state) => state.setNearFigure)
  const clearQaTestFigure = useAppStore((state) => state.clearQaTestFigure)
  const clearCaptureSession = useAppStore((state) => state.clearCaptureSession)
  const obtainFigureWithPhoto = useAppStore((state) => state.obtainFigureWithPhoto)
  const obtainFigureWithPhotoSynced = useAppStore((state) => state.obtainFigureWithPhotoSynced)
  const replaceFigurePhotoSynced = useAppStore((state) => state.replaceFigurePhotoSynced)

  const captureMode = captureSession?.mode ?? 'unlock'
  const isRetake = captureMode === 'retake'

  const {
    mapPosition,
    proximityPosition,
    gpsStatusLabel,
    error: geoError,
    errorType: geoErrorType,
    isLoading: geoLoading,
    requestPermission,
  } = useGeolocation()

  const handleObtain = useCallback(
    (figureId, photoData) => {
      if (photoData?.photoSource === 'mobile-native') {
        return obtainFigureWithPhotoSynced(figureId, photoData)
      }
      return obtainFigureWithPhoto(figureId, photoData)
    },
    [obtainFigureWithPhoto, obtainFigureWithPhotoSynced],
  )

  const handleReplacePhoto = useCallback(
    (figureId, photoData) => replaceFigurePhotoSynced(figureId, photoData),
    [replaceFigurePhotoSynced],
  )

  const {
    phase,
    camera,
    capture,
    captureFromFile,
    openNativeCapture,
    acknowledgeChallenge,
    compressedPhoto,
    captureError,
    rewardFigure,
    pendingFigure,
    gpsProgress,
    gpsAccuracy,
    isReady,
    isProcessing,
    processingMessage,
    inCaptureRange,
    isApproximateGps,
    distanceMeters,
    retryCapture,
    clearPendingCapture,
    showRewardComplete,
    complete,
  } = useCaptureFlow({
    figure: nearFigure,
    position: proximityPosition ?? mapPosition,
    captureSession,
    captureMode,
    onObtainFigure: handleObtain,
    onReplacePhoto: handleReplacePhoto,
  })

  const nativePickerOpenedRef = useRef(false)

  const isPostCapturePhase =
    phase === CAPTURE_PHASES.REWARD ||
    phase === CAPTURE_PHASES.UNLOCK ||
    phase === CAPTURE_PHASES.PHOTO_UPDATED ||
    phase === CAPTURE_PHASES.DONE

  const isChallengePhase = phase === CAPTURE_PHASES.CHALLENGE

  const isCaptureSessionActive =
    isChallengePhase ||
    isPostCapturePhase ||
    phase === CAPTURE_PHASES.CAPTURING ||
    phase === CAPTURE_PHASES.COMPRESSING ||
    isProcessing ||
    Boolean(pendingFigure) ||
    Boolean(captureSession)

  const displayFigure = pendingFigure ?? captureSession?.figure ?? nearFigure

  useEffect(() => {
    if (!isMobileNative) {
      camera.initPermission()
    }
    return () => {
      stopVibration()
      if (!isMobileNative) {
        camera.stop()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobileNative])

  useLayoutEffect(() => {
    if (!isMobileNative) return
    if (phase === CAPTURE_PHASES.CHALLENGE) return
    if (nativePickerOpenedRef.current) return
    if (!displayFigure) return
    if (isPostCapturePhase || isProcessing) return
    if (phase === CAPTURE_PHASES.CAPTURING || phase === CAPTURE_PHASES.COMPRESSING) return

    nativePickerOpenedRef.current = true
    openNativeCapture()
  }, [
    displayFigure,
    isMobileNative,
    isPostCapturePhase,
    isProcessing,
    openNativeCapture,
    phase,
  ])

  useEffect(() => {
    if (isRetake || !nearFigure || isCaptureSessionActive) return

    const targetId = nearFigure.targetFigureId ?? nearFigure.id
    const stored = figures.find(
      (f) => String(f.id) === String(targetId) || String(f.id) === String(nearFigure.id),
    )
    if (stored?.obtenida) {
      setNearFigure(null)
      clearCaptureSession()
      navigate('/map', { replace: true })
    }
  }, [
    isRetake,
    nearFigure,
    figures,
    isCaptureSessionActive,
    clearCaptureSession,
    navigate,
    setNearFigure,
  ])

  useAppLifecycle({
    onVisible: async () => {
      requestPermission()
      if (
        !isMobileNative &&
        phase === CAPTURE_PHASES.CAMERA &&
        !camera.isReady &&
        !camera.isLoading &&
        !camera.needsPrompt &&
        !camera.isDenied &&
        !camera.useNativeFallback
      ) {
        await delay(PERMISSION_RETRY_DELAY_MS)
        camera.initPermission()
      }
    },
    onHidden: () => {
      stopVibration()
      if (!isMobileNative) {
        camera.stop()
      }
    },
  })

  useEffect(() => {
    if (isRetake) return
    if (!nearFigure && !isCaptureSessionActive) {
      navigate('/map', { replace: true })
    }
  }, [isRetake, nearFigure, isCaptureSessionActive, navigate])

  useEffect(() => {
    const lockPortrait = async () => {
      try {
        await screen.orientation?.lock?.('portrait-primary')
      } catch {
        // ignore
      }
    }

    lockPortrait()

    return () => {
      try {
        screen.orientation?.unlock?.()
      } catch {
        // ignore
      }
    }
  }, [])

  const handleClose = useCallback(() => {
    stopVibration()
    camera.stop()
    clearPendingCapture()
    clearCaptureSession()
    nativePickerOpenedRef.current = false
    setNearFigure(null)
    navigate(isRetake ? withQa('/my-figures') : '/map')
  }, [camera, clearCaptureSession, clearPendingCapture, isRetake, navigate, setNearFigure, withQa])

  const handleComplete = useCallback(() => {
    complete()
    clearCaptureSession()
    clearQaTestFigure()
    setNearFigure(null)
    nativePickerOpenedRef.current = false
    captureSyncLog.info('navigating to my-figures')
    navigate(withQa('/my-figures'), { replace: true })
  }, [clearCaptureSession, clearQaTestFigure, complete, navigate, setNearFigure, withQa])

  const handlePhotoUpdatedComplete = useCallback(() => {
    complete()
    clearCaptureSession()
    setNearFigure(null)
    nativePickerOpenedRef.current = false
    navigate(withQa('/my-figures'), { replace: true })
  }, [clearCaptureSession, complete, navigate, setNearFigure, withQa])

  const handleRetryGeo = useCallback(async () => {
    requestPermission()
    await delay(PERMISSION_RETRY_DELAY_MS)
    camera.initPermission()
  }, [camera, requestPermission])

  const handleOpenCamera = useCallback(() => {
    camera.requestCamera()
  }, [camera])

  const handleUseNativeCamera = useCallback(() => {
    camera.useNativeCamera()
  }, [camera])

  const handleFileSelected = useCallback(
    (file) => {
      void captureFromFile(file).catch(() => {
        // Errores recuperables ya se manejan dentro del hook.
      })
    },
    [captureFromFile],
  )

  const handleRetryNative = useCallback(() => {
    nativePickerOpenedRef.current = false
    retryCapture()
  }, [retryCapture])

  const geoPermissionDenied = geoErrorType === 'denied'
  const geoSignalIssue =
    geoErrorType === 'timeout' || geoErrorType === 'unavailable'
  const needsGeoUi =
    geoPermissionDenied || (geoSignalIssue && !mapPosition && !geoLoading)

  if (phase === CAPTURE_PHASES.CHALLENGE && displayFigure) {
    return (
      <CaptureChallengeInterstitial
        figure={displayFigure}
        onContinue={acknowledgeChallenge}
        onClose={handleClose}
      />
    )
  }

  if (phase === CAPTURE_PHASES.REWARD && rewardFigure) {
    return (
      <Suspense fallback={<RewardSkeleton />}>
        <RewardAnimation
          figure={rewardFigure}
          photoUrl={compressedPhoto}
          onComplete={showRewardComplete}
        />
      </Suspense>
    )
  }

  if (phase === CAPTURE_PHASES.PHOTO_UPDATED && rewardFigure) {
    return (
      <Suspense fallback={<RewardSkeleton />}>
        <PhotoUpdatedAnimation
          figure={rewardFigure}
          photoUrl={compressedPhoto}
          onComplete={handlePhotoUpdatedComplete}
        />
      </Suspense>
    )
  }

  if (phase === CAPTURE_PHASES.UNLOCK) {
    return (
      <Suspense fallback={<RewardSkeleton />}>
        <UnlockAnimation onComplete={handleComplete} />
      </Suspense>
    )
  }

  if (!nearFigure && !pendingFigure && !captureSession?.figure) return null

  if (needsGeoUi) {
    return (
      <PermissionFallback
        cameraDenied={false}
        geoDenied={geoPermissionDenied}
        geoError={geoError}
        geoErrorType={geoErrorType}
        onRetry={handleRetryGeo}
        onBack={handleClose}
      />
    )
  }

  const isCapturing = isProcessing

  const showCaptureError =
    Boolean(captureError) &&
    phase === CAPTURE_PHASES.CAMERA &&
    !isProcessing

  if (isMobileNative) {
    return (
      <NativeCapturePanel
        figure={displayFigure}
        fileInputRef={camera.fileInputRef}
        isProcessing={isCapturing}
        processingMessage={processingMessage}
        isOpening={!isCapturing && !showCaptureError}
        captureError={showCaptureError ? captureError : null}
        onFileSelected={handleFileSelected}
        onRetry={handleRetryNative}
        onClose={handleClose}
      />
    )
  }

  if (camera.needsPrompt) {
    return (
      <CameraAccessGate
        variant="prompt"
        onOpenCamera={handleOpenCamera}
        onUseNative={handleUseNativeCamera}
        onBack={handleClose}
      />
    )
  }

  if (camera.isDenied) {
    return (
      <CameraAccessGate
        variant="denied"
        onUseNative={handleUseNativeCamera}
        onBack={handleClose}
      />
    )
  }

  const showCamera =
    camera.isLoading ||
    camera.isReady ||
    camera.useNativeFallback ||
    phase === CAPTURE_PHASES.CAMERA

  return (
    <div className="relative h-full overflow-hidden">
      <div className="landscape-blocker fixed inset-0 z-[100] hidden items-center justify-center bg-zinc-950 px-8 text-center">
        <div>
          <p className="text-lg font-bold text-white">Girá el celular</p>
          <p className="mt-2 text-sm text-zinc-400">
            La cámara solo funciona en modo vertical.
          </p>
        </div>
      </div>

      {showCamera && (
        <CameraView
          videoRef={camera.videoRef}
          fileInputRef={camera.fileInputRef}
          figure={displayFigure}
          gpsProgress={gpsProgress}
          gpsAccuracy={gpsAccuracy}
          isReady={isReady}
          isCapturing={isCapturing}
          nativeOnly={false}
          useNativeFallback={camera.useNativeFallback}
          showBlackPreviewFallback={camera.showBlackPreviewFallback}
          inCaptureRange={inCaptureRange}
          distanceMeters={distanceMeters}
          onCapture={capture}
          onFileSelected={handleFileSelected}
          onUseNativeCamera={handleUseNativeCamera}
          onClose={handleClose}
        />
      )}

      {camera.isLoading && (
        <div className="safe-top safe-bottom pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/60">
          <p className="map-skeleton-pulse text-sm text-white/90">Abriendo cámara…</p>
        </div>
      )}

      {isApproximateGps && inCaptureRange && (
        <div className="safe-top pointer-events-none absolute inset-x-0 top-4 z-40 flex justify-center px-4">
          <p className="rounded-full bg-black/75 px-4 py-2 text-xs text-amber-100/90">
            Tu ubicación es aproximada. La foto será usada como comprobante.
          </p>
        </div>
      )}

      {!inCaptureRange && mapPosition && (
        <div className="safe-top pointer-events-none absolute inset-x-0 top-4 z-40 flex justify-center px-4">
          <p className="rounded-full bg-black/75 px-4 py-2 text-xs text-white/85">
            {gpsStatusLabel}
            {distanceMeters != null
              ? ` · ~${Math.round(distanceMeters)}m del punto`
              : mapPosition.accuracy
                ? ` (~${Math.round(mapPosition.accuracy)}m precisión)`
                : ''}
          </p>
        </div>
      )}

      {geoLoading && !mapPosition && (
        <div className="safe-top safe-bottom pointer-events-none absolute inset-x-0 top-4 z-40 flex justify-center px-4">
          <p className="rounded-full bg-black/70 px-4 py-2 text-xs text-white/80">
            Validando ubicación…
          </p>
        </div>
      )}

      {showCaptureError && (
        <div className="safe-bottom absolute inset-x-4 bottom-28 z-50 rounded-xl bg-red-950/90 px-4 py-4 text-center">
          <p className="text-sm text-red-200">{captureError}</p>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={retryCapture}
              className="min-h-[44px] rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase text-white"
            >
              Volver a intentar
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="min-h-[44px] text-xs font-semibold text-white/75 underline"
            >
              Volver al mapa
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
