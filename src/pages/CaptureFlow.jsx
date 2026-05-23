import { useCallback, useEffect } from 'react'
import { lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { CameraView } from '../components/camera'
import { CameraAccessGate } from '../components/camera/CameraAccessGate'
import { PermissionFallback } from '../components/qa/PermissionFallback'
import { useGeolocation } from '../hooks/useGeolocation'
import { useCaptureFlow, CAPTURE_PHASES } from '../hooks/useCaptureFlow'
import { useAppLifecycle } from '../hooks/useAppLifecycle'
import { useAppStore } from '../store/useAppStore'
import { stopVibration } from '../utils/vibration'
import { PERMISSION_RETRY_DELAY_MS } from '../config/ux'
import { delay } from '../utils/recovery'

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

function RewardSkeleton() {
  return (
    <div className="safe-top safe-bottom flex h-full items-center justify-center bg-zinc-950">
      <div className="map-skeleton-pulse h-64 w-48 rounded-2xl bg-zinc-800" />
    </div>
  )
}

export function CaptureFlow() {
  const navigate = useNavigate()
  const nearFigure = useAppStore((state) => state.nearFigure)
  const figures = useAppStore((state) => state.figures)
  const setNearFigure = useAppStore((state) => state.setNearFigure)
  const obtainFigureWithPhoto = useAppStore((state) => state.obtainFigureWithPhoto)

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
      return obtainFigureWithPhoto(figureId, photoData)
    },
    [obtainFigureWithPhoto],
  )

  const {
    phase,
    camera,
    capture,
    captureFromFile,
    compressedPhoto,
    captureError,
    rewardFigure,
    gpsProgress,
    gpsAccuracy,
    isReady,
    isProcessing,
    inCaptureRange,
    isApproximateGps,
    distanceMeters,
    retryCapture,
    showRewardComplete,
    complete,
  } = useCaptureFlow({
    figure: nearFigure,
    position: proximityPosition ?? mapPosition,
    onObtainFigure: handleObtain,
  })

  const isPostCapturePhase =
    phase === CAPTURE_PHASES.REWARD ||
    phase === CAPTURE_PHASES.UNLOCK ||
    phase === CAPTURE_PHASES.DONE

  useEffect(() => {
    camera.initPermission()
    return () => {
      stopVibration()
      camera.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!nearFigure || isPostCapturePhase) return

    const targetId = nearFigure.targetFigureId ?? nearFigure.id
    const stored = figures.find(
      (f) => f.id === targetId || f.id === nearFigure.id,
    )
    if (stored?.obtenida) {
      setNearFigure(null)
      navigate('/map', { replace: true })
    }
  }, [nearFigure, figures, isPostCapturePhase, navigate, setNearFigure])

  useAppLifecycle({
    onVisible: async () => {
      requestPermission()
      if (
        !camera.nativeOnly &&
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
      if (!camera.nativeOnly) {
        camera.stop()
      }
    },
  })

  useEffect(() => {
    if (!nearFigure && !isPostCapturePhase) {
      navigate('/map', { replace: true })
    }
  }, [nearFigure, isPostCapturePhase, navigate])

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
    setNearFigure(null)
    navigate('/map')
  }, [camera, navigate, setNearFigure])

  const handleComplete = useCallback(() => {
    complete()
    setNearFigure(null)
    navigate('/map', { replace: true })
  }, [complete, navigate, setNearFigure])

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

  const geoPermissionDenied = geoErrorType === 'denied'
  const geoSignalIssue =
    geoErrorType === 'timeout' || geoErrorType === 'unavailable'
  const needsGeoUi =
    geoPermissionDenied || (geoSignalIssue && !mapPosition && !geoLoading)

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

  if (phase === CAPTURE_PHASES.UNLOCK) {
    return (
      <Suspense fallback={<RewardSkeleton />}>
        <UnlockAnimation onComplete={handleComplete} />
      </Suspense>
    )
  }

  if (!nearFigure) return null

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

  const isCapturing =
    phase === CAPTURE_PHASES.CAPTURING ||
    phase === CAPTURE_PHASES.COMPRESSING ||
    isProcessing

  const showCamera =
    camera.nativeOnly ||
    camera.isLoading ||
    camera.isReady ||
    camera.useNativeFallback ||
    phase === CAPTURE_PHASES.CAMERA

  const showCaptureError =
    Boolean(captureError) && phase === CAPTURE_PHASES.CAMERA && !isProcessing

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
          figure={nearFigure}
          gpsProgress={gpsProgress}
          gpsAccuracy={gpsAccuracy}
          isReady={isReady}
          isCapturing={isCapturing}
          nativeOnly={camera.nativeOnly}
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

      {camera.isLoading && !camera.nativeOnly && (
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
