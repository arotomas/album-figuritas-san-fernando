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
import { getQaState } from '../utils/diagnostics'
import { useAppLifecycle } from './useAppLifecycle'
import { cleanupMediaStream } from '../utils/cleanup'

/**
 * Cámara con permisos explícitos, preview robusto y fallback nativo mobile.
 */
export function useCamera() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const startingRef = useRef(false)
  const blackPreviewTimerRef = useRef(null)
  const fileInputRef = useRef(null)

  const [permission, setPermission] = useState('unknown')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [useNativeFallback, setUseNativeFallback] = useState(false)
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

  const stop = useCallback(() => {
    clearBlackPreviewTimer()
    cleanupMediaStream(streamRef, videoRef)
    setShowBlackPreviewFallback(false)
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
      if (node && streamRef.current) {
        attachStreamToVideo(node, streamRef.current)
          .then(() => {
            if (statusRef.current === 'active') {
              scheduleBlackPreviewCheck()
            }
          })
          .catch(() => {})
      }
    },
    [scheduleBlackPreviewCheck],
  )

  const startStream = useCallback(async () => {
    if (startingRef.current) return
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
    await startStream()
  }, [startStream])

  const useNativeCamera = useCallback(() => {
    enableNativeFallback()
  }, [enableNativeFallback])

  const openNativePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const wasActiveRef = useRef(false)

  useAppLifecycle({
    onHidden: () => {
      wasActiveRef.current =
        statusRef.current === 'active' || statusRef.current === 'loading'
      stop()
    },
    onVisible: () => {
      if (
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
      cleanupMediaStream(streamRef, videoRef)
      startingRef.current = false
    }
  }, [clearBlackPreviewTimer])

  const needsPrompt = status === 'awaiting-permission' && !useNativeFallback
  const isDenied = status === 'denied' && !useNativeFallback

  return {
    videoRef: videoCallbackRef,
    fileInputRef,
    getVideoElement: () => videoRef.current,
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
