import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  attachStreamToVideo,
  BLACK_PREVIEW_TIMEOUT_MS,
  getRearCameraStream,
  isBlackVideoPreview,
  isCameraSupported,
  isPermissionDeniedError,
  logCameraPermission,
  queryCameraPermission,
} from '../utils/camera'
import { cameraLog } from '../utils/cameraLog'
import { isNativeCameraOnly } from '../utils/device'
import { getQaState } from '../utils/diagnostics'
import { useAppLifecycle } from './useAppLifecycle'
import { cleanupMediaStream } from '../utils/cleanup'

/**
 * Mobile: siempre cámara nativa (input file).
 * Desktop: getUserMedia con fallback nativo.
 */
export function useCamera() {
  const nativeOnly = useMemo(() => isNativeCameraOnly(), [])

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const startingRef = useRef(false)
  const blackPreviewTimerRef = useRef(null)
  const fileInputRef = useRef(null)

  const [permission, setPermission] = useState(nativeOnly ? 'native' : 'unknown')
  const [status, setStatus] = useState(nativeOnly ? 'native' : 'idle')
  const [error, setError] = useState(null)
  const [useNativeFallback, setUseNativeFallback] = useState(nativeOnly)
  const [showBlackPreviewFallback, setShowBlackPreviewFallback] = useState(false)
  const statusRef = useRef(nativeOnly ? 'native' : 'idle')
  const permissionRef = useRef(nativeOnly ? 'native' : 'unknown')
  const useNativeFallbackRef = useRef(nativeOnly)

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

  const stop = useCallback(() => {
    clearBlackPreviewTimer()
    cleanupMediaStream(streamRef, videoRef)
    setShowBlackPreviewFallback(false)
    if (nativeOnly) {
      setUseNativeFallback(true)
      setStatus('native')
      startingRef.current = false
      return
    }
    setStatus((current) => {
      if (current === 'denied') return 'denied'
      if (current === 'awaiting-permission') return 'awaiting-permission'
      return 'idle'
    })
    startingRef.current = false
  }, [clearBlackPreviewTimer, nativeOnly])

  const enableNativeFallback = useCallback(({ keepBlackFlag = false } = {}) => {
    clearBlackPreviewTimer()
    setUseNativeFallback(true)
    if (!keepBlackFlag) {
      setShowBlackPreviewFallback(false)
    }
    setStatus('native')
    setError(null)
    cleanupMediaStream(streamRef, videoRef)
    startingRef.current = false
  }, [clearBlackPreviewTimer])

  const scheduleBlackPreviewCheck = useCallback(() => {
    if (nativeOnly) return

    clearBlackPreviewTimer()

    blackPreviewTimerRef.current = setTimeout(() => {
      const video = videoRef.current
      if (statusRef.current !== 'active') return

      if (isBlackVideoPreview(video)) {
        cameraLog.blackPreviewFallback({
          width: video?.videoWidth ?? 0,
          height: video?.videoHeight ?? 0,
          readyState: video?.readyState ?? null,
        })
        setShowBlackPreviewFallback(true)
        enableNativeFallback({ keepBlackFlag: true })
      }
    }, BLACK_PREVIEW_TIMEOUT_MS)
  }, [clearBlackPreviewTimer, enableNativeFallback, nativeOnly])

  const videoCallbackRef = useCallback(
    (node) => {
      videoRef.current = node
      if (nativeOnly || !node || !streamRef.current) return

      attachStreamToVideo(node, streamRef.current)
        .then(() => {
          if (statusRef.current === 'active') {
            scheduleBlackPreviewCheck()
          }
        })
        .catch(() => {})
    },
    [nativeOnly, scheduleBlackPreviewCheck],
  )

  const startStream = useCallback(async () => {
    if (nativeOnly || startingRef.current) return
    startingRef.current = true

    if (getQaState().forcePermissionDenied) {
      setPermission('denied')
      setStatus('denied')
      setError('PERMISSION_DENIED')
      setUseNativeFallback(false)
      startingRef.current = false
      return
    }

    if (!isCameraSupported()) {
      enableNativeFallback()
      startingRef.current = false
      return
    }

    setUseNativeFallback(false)
    setShowBlackPreviewFallback(false)
    setStatus('loading')
    setError(null)

    try {
      const stream = await getRearCameraStream()
      streamRef.current = stream

      if (videoRef.current) {
        await attachStreamToVideo(videoRef.current, stream)
      }

      setPermission('granted')
      setStatus('active')
      scheduleBlackPreviewCheck()
    } catch (err) {
      if (isPermissionDeniedError(err)) {
        logCameraPermission('denied')
        setPermission('denied')
        setStatus('denied')
        setError('PERMISSION_DENIED')
        setUseNativeFallback(false)
      } else {
        cameraLog.warn('getUserMedia failed', { message: err?.message })
        enableNativeFallback()
      }
    } finally {
      startingRef.current = false
    }
  }, [enableNativeFallback, nativeOnly, scheduleBlackPreviewCheck])

  const initPermission = useCallback(async () => {
    if (nativeOnly) {
      enableNativeFallback()
      return
    }

    if (getQaState().forcePermissionDenied) {
      setPermission('denied')
      setStatus('denied')
      return
    }

    if (!isCameraSupported()) {
      enableNativeFallback()
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
      setStatus('denied')
      return
    }

    setStatus('awaiting-permission')
  }, [enableNativeFallback, nativeOnly, startStream])

  const requestCamera = useCallback(async () => {
    if (nativeOnly) {
      cameraLog.mobileNativeInputOpen()
      fileInputRef.current?.click()
      return
    }
    await startStream()
  }, [nativeOnly, startStream])

  const useNativeCamera = useCallback(() => {
    enableNativeFallback()
    cameraLog.mobileNativeInputOpen()
    fileInputRef.current?.click()
  }, [enableNativeFallback])

  const openNativePicker = useCallback(() => {
    cameraLog.mobileNativeInputOpen()
    fileInputRef.current?.click()
  }, [])

  const wasActiveRef = useRef(false)

  useAppLifecycle({
    onHidden: () => {
      wasActiveRef.current =
        statusRef.current === 'active' || statusRef.current === 'loading'
      if (!nativeOnly) {
        stop()
      }
    },
    onVisible: () => {
      if (
        !nativeOnly &&
        wasActiveRef.current &&
        !useNativeFallbackRef.current &&
        permissionRef.current === 'granted'
      ) {
        startStream()
      }
    },
  })

  useEffect(() => {
    return () => {
      clearBlackPreviewTimer()
      if (!nativeOnly) {
        cleanupMediaStream(streamRef, videoRef)
      }
      startingRef.current = false
    }
  }, [clearBlackPreviewTimer, nativeOnly])

  const needsPrompt =
    !nativeOnly && status === 'awaiting-permission' && !useNativeFallback
  const isDenied = !nativeOnly && status === 'denied' && !useNativeFallback

  return {
    videoRef: videoCallbackRef,
    fileInputRef,
    getVideoElement: () => videoRef.current,
    nativeOnly,
    permission,
    status,
    error,
    useNativeFallback,
    showBlackPreviewFallback,
    needsPrompt,
    isDenied,
    isReady: status === 'active' || status === 'native',
    isLoading: status === 'loading',
    initPermission,
    requestCamera,
    useNativeCamera,
    start: startStream,
    stop,
    openNativePicker,
  }
}
