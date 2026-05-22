import { useCallback, useEffect } from 'react'
import { lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { CameraView } from '../components/camera'
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
      obtainFigureWithPhoto(figureId, photoData)
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
    gpsProgress,
    gpsAccuracy,
    isReady,
    inCaptureRange,
    isApproximateGps,
    distanceMeters,
    showRewardComplete,
    complete,
  } = useCaptureFlow({
    figure: nearFigure,
    position: proximityPosition ?? mapPosition,
    onObtainFigure: handleObtain,
  })

  useEffect(() => {
    camera.start()
    return () => {
      stopVibration()
      camera.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!nearFigure) return

    const targetId = nearFigure.targetFigureId ?? nearFigure.id
    const stored = figures.find(
      (f) => f.id === targetId || f.id === nearFigure.id,
    )
    if (stored?.obtenida) {
      setNearFigure(null)
      navigate('/map', { replace: true })
    }
  }, [nearFigure, figures, navigate, setNearFigure])

  useAppLifecycle({
    onVisible: async () => {
      requestPermission()
      if (
        phase === CAPTURE_PHASES.CAMERA &&
        !camera.isReady &&
        !camera.isLoading
      ) {
        await delay(PERMISSION_RETRY_DELAY_MS)
        camera.start()
      }
    },
    onHidden: () => {
      stopVibration()
      camera.stop()
    },
  })

  useEffect(() => {
    if (!nearFigure) {
      navigate('/map', { replace: true })
    }
  }, [nearFigure, navigate])

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
    navigate('/map')
  }, [camera, navigate])

  const handleComplete = useCallback(() => {
    complete()
    navigate('/map', { replace: true })
  }, [complete, navigate])

  const handleRetry = useCallback(async () => {
    requestPermission()
    await delay(PERMISSION_RETRY_DELAY_MS)
    camera.start()
  }, [camera, requestPermission])

  const cameraDenied = camera.isDenied
  const cameraError = camera.error
  const geoPermissionDenied = geoErrorType === 'denied'
  const geoSignalIssue =
    geoErrorType === 'timeout' || geoErrorType === 'unavailable'
  const needsPermissionUi =
    cameraDenied ||
    geoPermissionDenied ||
    (camera.status === 'error' && !camera.useNativeFallback)

  const needsSignalUi =
    geoSignalIssue && !mapPosition && !geoLoading && !cameraDenied

  useEffect(() => {
    if (needsPermissionUi || needsSignalUi) {
      camera.stop()
    }
  }, [needsPermissionUi, needsSignalUi, camera])

  if (!nearFigure) return null

  if (needsPermissionUi || needsSignalUi) {
    return (
      <PermissionFallback
        cameraDenied={cameraDenied}
        cameraError={cameraError}
        geoDenied={geoPermissionDenied}
        geoError={geoError}
        geoErrorType={geoErrorType}
        onRetry={handleRetry}
        onBack={handleClose}
      />
    )
  }

  if (phase === CAPTURE_PHASES.REWARD) {
    return (
      <Suspense fallback={<RewardSkeleton />}>
        <RewardAnimation
          figure={nearFigure}
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

  const isCapturing =
    phase === CAPTURE_PHASES.CAPTURING ||
    phase === CAPTURE_PHASES.COMPRESSING

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
          figure={nearFigure}
          gpsProgress={gpsProgress}
          gpsAccuracy={gpsAccuracy}
          isReady={isReady}
          isCapturing={isCapturing}
          useNativeFallback={camera.useNativeFallback}
          inCaptureRange={inCaptureRange}
          distanceMeters={distanceMeters}
          onCapture={capture}
          onFileSelected={captureFromFile}
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

      {captureError && (
        <div className="safe-bottom absolute inset-x-4 bottom-28 z-50 rounded-xl bg-red-950/90 px-4 py-3 text-center">
          <p className="text-sm text-red-200">{captureError}</p>
          <button
            type="button"
            onClick={() => capture()}
            className="mt-2 min-h-[44px] text-xs font-bold uppercase text-white underline"
          >
            Reintentar captura
          </button>
        </div>
      )}
    </div>
  )
}
