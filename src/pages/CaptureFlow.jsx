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
    <div className="safe-top safe-bottom flex min-h-dvh items-center justify-center bg-zinc-950">
      <div className="map-skeleton-pulse h-64 w-48 rounded-2xl bg-zinc-800" />
    </div>
  )
}

export function CaptureFlow() {
  const navigate = useNavigate()
  const nearFigure = useAppStore((state) => state.nearFigure)
  const obtainFigureWithPhoto = useAppStore((state) => state.obtainFigureWithPhoto)

  const {
    position,
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

  const flow = useCaptureFlow({
    figure: nearFigure,
    position,
    onObtainFigure: handleObtain,
  })

  useEffect(() => {
    flow.camera.start()
    return () => {
      stopVibration()
      flow.camera.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useAppLifecycle({
    onVisible: async () => {
      requestPermission()
      if (
        flow.phase === CAPTURE_PHASES.CAMERA &&
        !flow.camera.isReady &&
        !flow.camera.isLoading
      ) {
        await delay(PERMISSION_RETRY_DELAY_MS)
        flow.camera.start()
      }
    },
    onHidden: () => {
      stopVibration()
      flow.camera.stop()
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
    flow.camera.stop()
    navigate('/map')
  }, [flow.camera, navigate])

  const handleComplete = useCallback(() => {
    flow.complete()
    navigate('/map', { replace: true })
  }, [flow, navigate])

  const handleRetry = useCallback(async () => {
    requestPermission()
    await delay(PERMISSION_RETRY_DELAY_MS)
    flow.camera.start()
  }, [flow.camera, requestPermission])

  if (!nearFigure) return null

  const cameraDenied = flow.camera.isDenied
  const cameraError = flow.camera.error
  const geoPermissionDenied = geoErrorType === 'denied'
  const geoSignalIssue =
    geoErrorType === 'timeout' || geoErrorType === 'unavailable'
  const needsPermissionUi =
    cameraDenied ||
    geoPermissionDenied ||
    flow.camera.status === 'error'

  const needsSignalUi =
    geoSignalIssue && !position && !geoLoading && !cameraDenied

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

  if (flow.phase === CAPTURE_PHASES.REWARD) {
    return (
      <Suspense fallback={<RewardSkeleton />}>
        <RewardAnimation
          figure={nearFigure}
          photoUrl={flow.compressedPhoto}
          onComplete={flow.showRewardComplete}
        />
      </Suspense>
    )
  }

  if (flow.phase === CAPTURE_PHASES.UNLOCK) {
    return (
      <Suspense fallback={<RewardSkeleton />}>
        <UnlockAnimation onComplete={handleComplete} />
      </Suspense>
    )
  }

  const isCapturing =
    flow.phase === CAPTURE_PHASES.CAPTURING ||
    flow.phase === CAPTURE_PHASES.COMPRESSING

  const showCamera =
    flow.camera.isLoading ||
    flow.camera.isReady ||
    flow.phase === CAPTURE_PHASES.CAMERA

  return (
    <>
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
          videoRef={flow.camera.videoRef}
          figure={nearFigure}
          gpsProgress={flow.gpsProgress}
          isReady={flow.isReady}
          isCapturing={isCapturing}
          onCapture={flow.capture}
          onClose={handleClose}
        />
      )}

      {flow.camera.isLoading && (
        <div className="safe-top safe-bottom pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/60">
          <p className="map-skeleton-pulse text-sm text-white/90">Abriendo cámara…</p>
        </div>
      )}

      {geoLoading && !position && (
        <div className="safe-top safe-bottom pointer-events-none absolute inset-x-0 top-4 z-40 flex justify-center px-4">
          <p className="rounded-full bg-black/70 px-4 py-2 text-xs text-white/80">
            Validando ubicación…
          </p>
        </div>
      )}

      {flow.captureError && (
        <div className="safe-bottom absolute inset-x-4 bottom-28 z-50 rounded-xl bg-red-950/90 px-4 py-3 text-center">
          <p className="text-sm text-red-200">{flow.captureError}</p>
          <button
            type="button"
            onClick={() => flow.capture()}
            className="mt-2 min-h-[44px] text-xs font-bold uppercase text-white underline"
          >
            Reintentar captura
          </button>
        </div>
      )}
    </>
  )
}
