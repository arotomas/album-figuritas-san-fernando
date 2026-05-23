import { useCallback, useEffect, useRef, useState } from 'react'
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
import { isMobileDevice } from '../utils/device'
import { getQaState } from '../utils/diagnostics'
import { useAppLifecycle } from './useAppLifecycle'
import { cleanupMediaStream } from '../utils/cleanup'

const nativeOnlyDevice = isMobileDevice()

/**
 * Mobile: siempre cámara nativa (input file).
 * Desktop: getUserMedia con fallback nativo.
 */
export function useCamera() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const startingRef = useRef(false)
  const blackPreviewTimerRef = useRef(null)
  const fileInputRef = useRef(null)

  const [permission, setPermission] = useState(nativeOnlyDevice ? 'native' : 'unknown')
  const [status, setStatus] = useState(nativeOnlyDevice ? 'native' : 'idle')
  const [error, setError] = useState(null)
  const [useNativeFallback, setUseNativeFallback] = useState(nativeOnlyDevice)
  const [showBlackPreviewFallback, setShowBlackPreviewFallback] = useState(false)
  const statusRef = useRef(nativeOnlyDevice ? 'native' : 'idle')
  const permissionRef = useRef(nativeOnlyDevice ? 'native' : 'unknown')
  const useNativeFallbackRef = useRef(nativeOnlyDevice)

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
    if (nativeOnlyDevice) {
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
  }, [clearBlackPreviewTimer])

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
    if (nativeOnlyDevice) return

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
  }, [clearBlackPreviewTimer, enableNativeFallback])

  const videoCallbackRef = useCallback(
    (node) => {
      videoRef.current = node
      if (nativeOnlyDevice || !node || !streamRef.current) return

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

  const startStream = useCallback(async () => {
    if (nativeOnlyDevice || startingRef.current) return
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
  }, [enableNativeFallback, scheduleBlackPreviewCheck])

  const initPermission = useCallback(async () => {
    if (nativeOnlyDevice) {
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
  }, [enableNativeFallback, startStream])

  const requestCamera = useCallback(async () => {
    if (nativeOnlyDevice) {
      fileInputRef.current?.click()
      return
    }
    await startStream()
  }, [startStream])

  const useNativeCamera = useCallback(() => {
    enableNativeFallback()
    fileInputRef.current?.click()
  }, [enableNativeFallback])

  const openNativePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const wasActiveRef = useRef(false)

  useAppLifecycle({
    onHidden: () => {
      wasActiveRef.current =
        statusRef.current === 'active' || statusRef.current === 'loading'
      if (!nativeOnlyDevice) {
        stop()
      }
    },
    onVisible: () => {
      if (
        !nativeOnlyDevice &&
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
      if (!nativeOnlyDevice) {
        cleanupMediaStream(streamRef, videoRef)
      }
      startingRef.current = false
    }
  }, [clearBlackPreviewTimer])

  const needsPrompt =
    !nativeOnlyDevice && status === 'awaiting-permission' && !useNativeFallback
  const isDenied = !nativeOnlyDevice && status === 'denied' && !useNativeFallback

  return {
    videoRef: videoCallbackRef,
    fileInputRef,
    getVideoElement: () => videoRef.current,
    nativeOnly: nativeOnlyDevice,
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
