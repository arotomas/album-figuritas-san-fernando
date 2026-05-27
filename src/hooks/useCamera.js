import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  attachStreamToVideo,
  BLACK_PREVIEW_TIMEOUT_MS,
  getRearCameraStream,
  isBlackVideoPreview,
  isPermissionDeniedError,
  logCameraPermission,
  queryCameraPermission,
} from '../utils/camera'
import {
  EMBEDDED_CAMERA_INIT_TIMEOUT_MS,
  getCameraCapabilities,
  getNativeFallbackMessage,
  mapCameraErrorToFallbackReason,
  shouldOfferNativeFallback,
  shouldTryEmbeddedCameraFirst,
} from '../utils/cameraCapabilities'
import { cameraLog } from '../utils/cameraLog'
import { getQaState } from '../utils/diagnostics'
import { useAppLifecycle } from './useAppLifecycle'
import { cleanupMediaStream } from '../utils/cleanup'
import { mediaTrace } from '../utils/mediaTrace'
import { withTimeout } from '../utils/withTimeout'

function hasLiveVideoStream(stream) {
  if (!stream?.active) return false
  return stream.getVideoTracks().some((track) => track.readyState === 'live')
}

/**
 * Cámara embebida (getUserMedia) como flujo principal.
 * Fallback automático a input nativo solo si falla la embebida.
 */
export function useCamera() {
  const capabilities = useMemo(() => getCameraCapabilities(), [])

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const mountedRef = useRef(false)
  const startingRef = useRef(false)
  const blackPreviewTimerRef = useRef(null)
  const fileInputRef = useRef(null)

  const [permission, setPermission] = useState('unknown')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [useNativeFallback, setUseNativeFallback] = useState(false)
  const [fallbackReason, setFallbackReason] = useState(null)
  const [showBlackPreviewFallback, setShowBlackPreviewFallback] = useState(false)

  const statusRef = useRef('idle')
  const permissionRef = useRef('unknown')
  const useNativeFallbackRef = useRef(false)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    permissionRef.current = permission
  }, [permission])

  useEffect(() => {
    useNativeFallbackRef.current = useNativeFallback
  }, [useNativeFallback])

  const clearBlackPreviewTimer = useCallback(() => {
    if (blackPreviewTimerRef.current) {
      clearTimeout(blackPreviewTimerRef.current)
      blackPreviewTimerRef.current = null
    }
  }, [])

  const enableNativeFallback = useCallback(
    ({ keepBlackFlag = false, reason = 'stream_failed' } = {}) => {
      if (!shouldOfferNativeFallback()) {
        setError('CAMERA_UNAVAILABLE')
        setStatus('denied')
        return false
      }

      clearBlackPreviewTimer()
      setUseNativeFallback(true)
      setFallbackReason(reason)
      if (!keepBlackFlag) {
        setShowBlackPreviewFallback(false)
      }
      setStatus('native')
      setError(null)
      cleanupMediaStream(streamRef, videoRef, { source: 'enableNativeFallback' })
      startingRef.current = false
      cameraLog.warn('embedded camera fallback', { reason })
      return true
    },
    [clearBlackPreviewTimer],
  )

  const stop = useCallback((source = 'stop') => {
    clearBlackPreviewTimer()
    cleanupMediaStream(streamRef, videoRef, { source })
    setShowBlackPreviewFallback(false)
    setStatus((current) => {
      if (useNativeFallbackRef.current) return 'native'
      if (current === 'denied') return 'denied'
      if (current === 'awaiting-permission') return 'awaiting-permission'
      return 'idle'
    })
    startingRef.current = false
  }, [clearBlackPreviewTimer])

  /** Solo hardware — seguro en unmount / browser back (sin setState). */
  const stopMediaTracks = useCallback((source = 'stopMediaTracks') => {
    mediaTrace('stopMediaTracks called', {
      source,
      mounted: mountedRef.current,
      streamRef,
      videoRef,
    })
    clearBlackPreviewTimer()
    cleanupMediaStream(streamRef, videoRef, { source })
    startingRef.current = false
  }, [clearBlackPreviewTimer])

  const scheduleBlackPreviewCheck = useCallback(() => {
    clearBlackPreviewTimer()

    blackPreviewTimerRef.current = setTimeout(() => {
      const video = videoRef.current
      if (statusRef.current !== 'active' || useNativeFallbackRef.current) return

      if (isBlackVideoPreview(video)) {
        cameraLog.blackPreviewFallback({
          width: video?.videoWidth ?? 0,
          height: video?.videoHeight ?? 0,
          readyState: video?.readyState ?? null,
        })
        setShowBlackPreviewFallback(true)
        enableNativeFallback({ keepBlackFlag: true, reason: 'black_preview' })
      }
    }, BLACK_PREVIEW_TIMEOUT_MS)
  }, [clearBlackPreviewTimer, enableNativeFallback])

  const videoCallbackRef = useCallback(
    (node) => {
      videoRef.current = node
      if (!node || !streamRef.current || useNativeFallbackRef.current) return

      attachStreamToVideo(node, streamRef.current)
        .then(() => {
          if (statusRef.current === 'active') {
            scheduleBlackPreviewCheck()
          }
        })
        .catch(() => {})
    },
    [scheduleBlackPreviewCheck],
  )

  const resumeLiveStream = useCallback(async () => {
    if (!hasLiveVideoStream(streamRef.current)) return false

    setUseNativeFallback(false)
    setFallbackReason(null)
    setShowBlackPreviewFallback(false)
    setPermission('granted')
    setStatus('active')
    setError(null)

    if (videoRef.current) {
      await attachStreamToVideo(videoRef.current, streamRef.current)
    }

    scheduleBlackPreviewCheck()
    return true
  }, [scheduleBlackPreviewCheck])

  const startStream = useCallback(async () => {
    if (startingRef.current || useNativeFallbackRef.current) return

    if (await resumeLiveStream()) {
      return
    }

    startingRef.current = true

    if (getQaState().forcePermissionDenied) {
      enableNativeFallback({ reason: 'permission_denied' })
      startingRef.current = false
      return
    }

    if (!shouldTryEmbeddedCameraFirst()) {
      enableNativeFallback({ reason: 'unsupported' })
      startingRef.current = false
      return
    }

    setUseNativeFallback(false)
    setFallbackReason(null)
    setShowBlackPreviewFallback(false)
    setStatus('loading')
    setError(null)

    try {
      const stream = await withTimeout(
        getRearCameraStream(),
        EMBEDDED_CAMERA_INIT_TIMEOUT_MS,
        'EMBEDDED_CAMERA_INIT',
      )
      streamRef.current = stream

      if (videoRef.current) {
        await attachStreamToVideo(videoRef.current, stream)
      }

      setPermission('granted')
      setStatus('active')
      scheduleBlackPreviewCheck()
      cameraLog.granted({ mode: 'embedded', ...capabilities })
    } catch (err) {
      const reason = mapCameraErrorToFallbackReason(err)
      cameraLog.warn('embedded stream failed', {
        message: err?.message,
        reason,
        isPermissionDenied: isPermissionDeniedError(err),
      })

      if (!enableNativeFallback({ reason })) {
        if (isPermissionDeniedError(err)) {
          setPermission('denied')
          setStatus('denied')
          setError('PERMISSION_DENIED')
        } else {
          setError(err?.message ?? 'CAMERA_INIT_FAILED')
          setStatus('denied')
        }
      }
    } finally {
      startingRef.current = false
    }
  }, [capabilities, enableNativeFallback, resumeLiveStream, scheduleBlackPreviewCheck])

  const initPermission = useCallback(async () => {
    cameraLog.getUserMediaStart({ phase: 'init', ...capabilities })

    if (getQaState().forcePermissionDenied) {
      enableNativeFallback({ reason: 'permission_denied' })
      return
    }

    if (!shouldTryEmbeddedCameraFirst()) {
      enableNativeFallback({ reason: 'unsupported' })
      return
    }

    const state = await queryCameraPermission()
    logCameraPermission(state)
    setPermission(state)

    if (state === 'granted') {
      await startStream()
      return
    }

    if (state === 'denied') {
      enableNativeFallback({ reason: 'permission_denied' })
      return
    }

    setStatus('awaiting-permission')
  }, [capabilities, enableNativeFallback, startStream])

  const requestCamera = useCallback(async () => {
    if (useNativeFallbackRef.current) {
      cameraLog.nativeInputOpen()
      fileInputRef.current?.click()
      return
    }
    await startStream()
  }, [startStream])

  const useNativeCamera = useCallback(() => {
    enableNativeFallback({ reason: 'manual' })
    cameraLog.nativeInputOpen()
    fileInputRef.current?.click()
  }, [enableNativeFallback])

  const openNativePicker = useCallback(() => {
    cameraLog.nativeInputOpen()
    fileInputRef.current?.click()
  }, [])

  const wasActiveRef = useRef(false)

  useAppLifecycle({
    onHidden: () => {
      wasActiveRef.current =
        statusRef.current === 'active' || statusRef.current === 'loading'
      if (!useNativeFallbackRef.current) {
        stop('visibility-hidden')
      }
    },
    onVisible: () => {
      if (
        wasActiveRef.current &&
        !useNativeFallbackRef.current &&
        permissionRef.current === 'granted'
      ) {
        void startStream()
      }
    },
  })

  useEffect(() => {
    mountedRef.current = true
    mediaTrace('useCamera mount', { streamRef, videoRef })
    return () => {
      mountedRef.current = false
      mediaTrace('useCamera unmount', { streamRef, videoRef })
      clearBlackPreviewTimer()
      cleanupMediaStream(streamRef, videoRef, { source: 'useCamera-unmount' })
      startingRef.current = false
    }
  }, [clearBlackPreviewTimer])

  const needsPrompt = status === 'awaiting-permission' && !useNativeFallback
  const isDenied = status === 'denied' && !useNativeFallback
  const fallbackMessage = fallbackReason
    ? getNativeFallbackMessage(fallbackReason)
    : null

  return {
    videoRef: videoCallbackRef,
    fileInputRef,
    getVideoElement: () => videoRef.current,
    capabilities,
    permission,
    status,
    error,
    useNativeFallback,
    fallbackReason,
    fallbackMessage,
    showBlackPreviewFallback,
    needsPrompt,
    isDenied,
    isReady: status === 'active' || status === 'native',
    isEmbeddedActive: status === 'active' && !useNativeFallback,
    isLoading: status === 'loading',
    initPermission,
    requestCamera,
    useNativeCamera,
    start: startStream,
    stop,
    stopMediaTracks,
    openNativePicker,
  }
}
