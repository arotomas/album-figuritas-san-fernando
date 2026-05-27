import { useCallback, useEffect, useMemo, useRef } from 'react'
import { lazy, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CameraView } from '../components/camera'
import { CameraAccessGate } from '../components/camera/CameraAccessGate'
import { PermissionFallback } from '../components/qa/PermissionFallback'
import { useGeolocation } from '../hooks/useGeolocation'
import { useCaptureFlow, CAPTURE_PHASES, isPostCaptureFlowPhase } from '../hooks/useCaptureFlow'
import { CaptureChallengeInterstitial } from '../components/camera/CaptureChallengeInterstitial'
import { CaptureRewardErrorBoundary } from '../components/reward/CaptureRewardErrorBoundary'
import { useAppLifecycle } from '../hooks/useAppLifecycle'
import { useAppStore } from '../store/useAppStore'
import { stopVibration } from '../utils/vibration'
import { PERMISSION_RETRY_DELAY_MS } from '../config/ux'
import { delay } from '../utils/recovery'
import { useQaMode } from '../utils/qaMode'
import { captureSyncLog } from '../utils/captureSyncLog'
import { captureFlowLog } from '../utils/captureFlowLog'
import {
  capturePipelineTrace,
  traceCaptureSessionChange,
  traceMounted,
  traceNavigate,
  traceRender,
  unlockTrace,
  updateCapturePipelineSnapshot,
} from '../utils/capturePipelineTrace'

function lazyRewardModule(load, label) {
  return lazy(() =>
    load().catch((error) => {
      capturePipelineTrace('ERROR', `lazy chunk failed — ${label}`, {
        message: error?.message,
        stack: error?.stack,
      })
      throw error
    }),
  )
}

const RewardAnimation = lazyRewardModule(
  () =>
    import('../components/reward/RewardAnimation').then((m) => ({
      default: m.RewardAnimation,
    })),
  'RewardAnimation',
)

const UnlockAnimation = lazyRewardModule(
  () =>
    import('../components/reward/UnlockAnimation').then((m) => ({
      default: m.UnlockAnimation,
    })),
  'UnlockAnimation',
)

const PhotoUpdatedAnimation = lazyRewardModule(
  () =>
    import('../components/reward/PhotoUpdatedAnimation').then((m) => ({
      default: m.PhotoUpdatedAnimation,
    })),
  'PhotoUpdatedAnimation',
)

function RewardSkeleton() {
  return (
    <div className="safe-top safe-bottom flex h-full items-center justify-center bg-black">
      <div className="map-skeleton-pulse h-64 w-48 rounded-2xl bg-zinc-800" />
    </div>
  )
}

export function CaptureFlow() {
  const navigate = useNavigate()
  const location = useLocation()
  const { withQa } = useQaMode()
  const nearFigure = useAppStore((state) => state.nearFigure)
  const captureSession = useAppStore((state) => state.captureSession)
  const figures = useAppStore((state) => state.figures)
  const setNearFigure = useAppStore((state) => state.setNearFigure)
  const clearActiveTargetFigure = useAppStore((state) => state.clearActiveTargetFigure)
  const clearQaTestFigure = useAppStore((state) => state.clearQaTestFigure)
  const clearCaptureSession = useAppStore((state) => state.clearCaptureSession)
  const obtainFigureWithPhoto = useAppStore((state) => state.obtainFigureWithPhoto)
  const obtainFigureWithPhotoSynced = useAppStore((state) => state.obtainFigureWithPhotoSynced)
  const replaceFigurePhotoSynced = useAppStore((state) => state.replaceFigurePhotoSynced)

  const captureMode = captureSession?.mode ?? 'unlock'
  const isRetake = captureMode === 'retake'

  const {
    trustedPosition,
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

  const captureFigure = nearFigure ?? captureSession?.figure ?? null

  const sessionPosition = useMemo(() => {
    const snapshot = captureSession?.locationSnapshot
    if (!snapshot || snapshot.lat == null || snapshot.lng == null) return null
    return {
      lat: snapshot.lat,
      lng: snapshot.lng,
      accuracy: snapshot.accuracy ?? null,
    }
  }, [captureSession?.locationSnapshot])

  const liveGpsPosition = trustedPosition ?? proximityPosition ?? mapPosition ?? null

  const hasTrustedSessionGeo = Boolean(captureSession?.locationSnapshot?.lat != null)

  const {
    phase,
    camera,
    capture,
    captureFromFile,
    acknowledgeChallenge,
    compressedPhoto,
    captureError,
    rewardFigure,
    pendingFigure,
    gpsProgress,
    gpsAccuracy,
    isReady,
    isProcessing,
    inCaptureRange,
    isApproximateGps,
    proximityPhase,
    figureRarity,
    distanceMeters,
    retryCapture,
    clearPendingCapture,
    showRewardComplete,
    finalizeCapturePending,
    isUnlockSubmitted,
  } = useCaptureFlow({
    figure: captureFigure,
    position: liveGpsPosition,
    bootstrapPosition: sessionPosition,
    captureSession,
    captureMode,
    onObtainFigure: handleObtain,
    onReplacePhoto: handleReplacePhoto,
  })

  useEffect(() => {
    updateCapturePipelineSnapshot({
      phase,
      route: location.pathname,
      captureSession,
      unlockSubmitted: isUnlockSubmitted,
      rewardFigureId: rewardFigure?.id ?? null,
    })
  }, [captureSession, isUnlockSubmitted, location.pathname, phase, rewardFigure?.id])

  useEffect(() => {
    traceCaptureSessionChange(captureSession, 'store-update')
  }, [captureSession])

  const isRewardPhase =
    phase === CAPTURE_PHASES.REWARD ||
    phase === CAPTURE_PHASES.UNLOCK ||
    phase === CAPTURE_PHASES.PHOTO_UPDATED ||
    phase === CAPTURE_PHASES.DONE

  /** Protege contra abort/redirect mientras save+reveal están en curso. */
  const isCaptureFlowProtected =
    isRewardPhase || isUnlockSubmitted || isPostCaptureFlowPhase(phase)

  const isChallengePhase = phase === CAPTURE_PHASES.CHALLENGE

  const isCaptureSessionActive =
    isChallengePhase ||
    isCaptureFlowProtected ||
    isProcessing ||
    Boolean(pendingFigure) ||
    Boolean(captureSession)

  const displayFigure = pendingFigure ?? captureSession?.figure ?? nearFigure
  const isExitingRef = useRef(false)
  const isPostCaptureRef = useRef(false)
  const finalizeUnlockOnceRef = useRef(false)

  useEffect(() => {
    isPostCaptureRef.current = isRewardPhase || isUnlockSubmitted
  }, [isRewardPhase, isUnlockSubmitted])

  const abortCaptureFlow = useCallback(
    ({ reason = 'unknown', navigateAway = false, clearNear = false } = {}) => {
      if (import.meta.env.DEV) {
        captureFlowLog('CAPTURE', 'abort', {
          reason,
          navigateAway,
          phase: isPostCaptureRef.current ? 'post-capture' : 'active',
          pathname: location.pathname,
        })
      }

      isExitingRef.current = true
      stopVibration()
      camera.stopMediaTracks?.()
      clearPendingCapture()

      if (!isPostCaptureRef.current) {
        clearCaptureSession()
      }

      if (clearNear) {
        setNearFigure(null)
      }

      if (navigateAway) {
        const target = isRetake ? withQa('/my-figures') : withQa('/map')
        traceNavigate(target, reason)
        if (import.meta.env.DEV) {
          captureFlowLog('ROUTER', 'abort navigate', { target, reason })
        }
        navigate(target, { replace: true })
      }
    },
    [
      camera,
      clearCaptureSession,
      clearPendingCapture,
      isRetake,
      location.pathname,
      navigate,
      setNearFigure,
      withQa,
    ],
  )

  const abortCaptureFlowRef = useRef(abortCaptureFlow)
  abortCaptureFlowRef.current = abortCaptureFlow

  useEffect(() => {
    isExitingRef.current = false
    traceMounted('CaptureFlow', true)
    if (import.meta.env.DEV) {
      captureFlowLog('CAPTURE', 'mount', { pathname: location.pathname })
    }

    return () => {
      traceMounted('CaptureFlow', false)
      if (isExitingRef.current || finalizeUnlockOnceRef.current) {
        unlockTrace('capture flow unmount — skip abort (intentional finalize)', {
          finalize: finalizeUnlockOnceRef.current,
        })
        stopVibration()
        camera.stopMediaTracks?.()
        return
      }
      if (import.meta.env.DEV) {
        captureFlowLog('UNMOUNT', 'capture flow teardown', {
          postCapture: isPostCaptureRef.current,
        })
      }
      unlockTrace('capture flow unmount — abort teardown')
      abortCaptureFlowRef.current({ reason: 'browser-back-or-unmount' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    captureSyncLog.info('capture flow mount', {
      figureId: captureFigure?.id ?? null,
      sessionFigureId: captureSession?.figure?.id ?? null,
      hasTrustedSessionGeo,
      hasLivePosition: Boolean(liveGpsPosition),
      embeddedFirst: true,
      useNativeFallback: camera.useNativeFallback,
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    camera.initPermission()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isRetake || isExitingRef.current || isCaptureFlowProtected) return
    if (location.pathname !== '/capture') return
    if (!nearFigure || isCaptureSessionActive) return

    const targetId = nearFigure.targetFigureId ?? nearFigure.id
    const stored = figures.find(
      (f) => String(f.id) === String(targetId) || String(f.id) === String(nearFigure.id),
    )
    if (stored?.obtenida) {
      capturePipelineTrace('CAPTURE', 'abort already-obtained', {
        figureId: stored.id,
        phase,
        isCaptureSessionActive,
      })
      abortCaptureFlow({ reason: 'already-obtained', navigateAway: true, clearNear: true })
    }
  }, [
    abortCaptureFlow,
    figures,
    isCaptureFlowProtected,
    isCaptureSessionActive,
    isRetake,
    location.pathname,
    nearFigure,
    phase,
  ])

  useAppLifecycle({
    onVisible: async () => {
      requestPermission()
      if (
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
      camera.stopMediaTracks?.()
    },
  })

  useEffect(() => {
    if (isRetake || isExitingRef.current || isCaptureFlowProtected) return
    if (location.pathname !== '/capture') return
    if (nearFigure || isCaptureSessionActive) return

    if (import.meta.env.DEV) {
      captureFlowLog('ROUTER', 'redirect — no active capture session')
    }
    traceNavigate(withQa('/map'), 'no-active-session')
    navigate(withQa('/map'), { replace: true })
  }, [
    isCaptureFlowProtected,
    isCaptureSessionActive,
    isRetake,
    location.pathname,
    nearFigure,
    navigate,
    withQa,
  ])

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined
    const onPopState = () => {
      captureFlowLog('BACK', 'popstate', { pathname: window.location.pathname })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

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
    abortCaptureFlow({
      reason: 'user-close',
      navigateAway: true,
      clearNear: true,
    })
  }, [abortCaptureFlow])

  const runPostUnlockCleanup = useCallback(() => {
    unlockTrace('cleanup start')
    try {
      finalizeCapturePending()
      unlockTrace('captureSession clear')
      clearCaptureSession()
      clearQaTestFigure()
      setNearFigure(null)
      clearActiveTargetFigure()
      unlockTrace('cleanup end')
    } catch (error) {
      unlockTrace('cleanup error', { message: error?.message })
    }
  }, [
    clearActiveTargetFigure,
    clearCaptureSession,
    clearQaTestFigure,
    finalizeCapturePending,
    setNearFigure,
  ])

  const safeNavigateToAlbum = useCallback(() => {
    const target = withQa('/my-figures')
    unlockTrace('navigate start', { target })
    try {
      navigate(target, { replace: true })
      unlockTrace('navigate end', { target })
    } catch (error) {
      unlockTrace('navigate failed — hard redirect', { message: error?.message })
      window.location.href = target
    }
  }, [navigate, withQa])

  const handleComplete = useCallback(() => {
    if (finalizeUnlockOnceRef.current) {
      unlockTrace('complete callback ignored — duplicate')
      return
    }
    finalizeUnlockOnceRef.current = true
    isExitingRef.current = true
    isPostCaptureRef.current = true
    updateCapturePipelineSnapshot({ finalizeStarted: true })

    unlockTrace('complete callback start', {
      pathname: location.pathname,
      phase,
    })

    try {
      captureSyncLog.info('navigating to my-figures')
      safeNavigateToAlbum()
      queueMicrotask(() => {
        runPostUnlockCleanup()
      })
      unlockTrace('complete callback end')
    } catch (error) {
      unlockTrace('complete callback failed — hard redirect', {
        message: error?.message,
      })
      runPostUnlockCleanup()
      window.location.href = withQa('/my-figures')
    }
  }, [
    location.pathname,
    phase,
    runPostUnlockCleanup,
    safeNavigateToAlbum,
    withQa,
  ])

  const handlePhotoUpdatedComplete = useCallback(() => {
    if (finalizeUnlockOnceRef.current) return
    finalizeUnlockOnceRef.current = true
    isExitingRef.current = true
    isPostCaptureRef.current = true
    unlockTrace('photo-updated complete callback start')
    safeNavigateToAlbum()
    queueMicrotask(() => {
      runPostUnlockCleanup()
    })
  }, [runPostUnlockCleanup, safeNavigateToAlbum])

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
    !hasTrustedSessionGeo &&
    (geoPermissionDenied || (geoSignalIssue && !mapPosition && !geoLoading))

  const handleRewardDegrade = useCallback(() => {
    capturePipelineTrace('CAPTURE', 'reward degrade → my-figures', {
      figureId: rewardFigure?.id ?? null,
    })
    window.setTimeout(() => {
      handleComplete()
    }, 1200)
  }, [handleComplete, rewardFigure?.id])

  useEffect(() => {
    if (phase === CAPTURE_PHASES.REWARD && rewardFigure) {
      traceRender('RewardAnimation', { figureId: rewardFigure.id })
    } else if (phase === CAPTURE_PHASES.PHOTO_UPDATED && rewardFigure) {
      traceRender('PhotoUpdatedAnimation', { figureId: rewardFigure.id })
    } else if (phase === CAPTURE_PHASES.UNLOCK) {
      traceRender('UnlockAnimation')
    }
  }, [phase, rewardFigure?.id])

  if (isExitingRef.current && location.pathname === '/capture') {
    return (
      <div
        className="safe-top safe-bottom screen-full bg-[#0a0a0b]"
        aria-busy="true"
        aria-label="Yendo a tu álbum"
      />
    )
  }

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
    if (import.meta.env.DEV) {
      captureSyncLog.info('reward phase render', { figureId: rewardFigure.id })
    }
    return (
      <CaptureRewardErrorBoundary
        degradeReason="reward-reveal"
        onDegrade={handleRewardDegrade}
      >
        <Suspense fallback={<RewardSkeleton />}>
          <RewardAnimation
            figure={rewardFigure}
            photoUrl={compressedPhoto}
            onComplete={showRewardComplete}
          />
        </Suspense>
      </CaptureRewardErrorBoundary>
    )
  }

  if (phase === CAPTURE_PHASES.PHOTO_UPDATED && rewardFigure) {
    return (
      <CaptureRewardErrorBoundary
        degradeReason="photo-updated-reveal"
        onDegrade={handlePhotoUpdatedComplete}
      >
        <Suspense fallback={<RewardSkeleton />}>
          <PhotoUpdatedAnimation
            figure={rewardFigure}
            photoUrl={compressedPhoto}
            onComplete={handlePhotoUpdatedComplete}
          />
        </Suspense>
      </CaptureRewardErrorBoundary>
    )
  }

  if (phase === CAPTURE_PHASES.UNLOCK) {
    return (
      <CaptureRewardErrorBoundary degradeReason="unlock-animation" onDegrade={handleComplete}>
        <Suspense fallback={<RewardSkeleton />}>
          <UnlockAnimation onComplete={handleComplete} />
        </Suspense>
      </CaptureRewardErrorBoundary>
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
          useNativeFallback={camera.useNativeFallback}
          fallbackMessage={camera.fallbackMessage}
          inCaptureRange={inCaptureRange}
          proximityPhase={proximityPhase}
          figureRarity={figureRarity}
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
