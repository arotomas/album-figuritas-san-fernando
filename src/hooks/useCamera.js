import { useCallback, useEffect, useRef, useState } from 'react'
import {
  attachStreamToVideo,
  getRearCameraStream,
  isCameraSupported,
  isPermissionDeniedError,
  stopMediaStream,
} from '../utils/camera'
import { getQaState } from '../utils/diagnostics'
import { useAppLifecycle } from './useAppLifecycle'
import { cleanupMediaStream } from '../utils/cleanup'
import { captureLog } from '../utils/devLog'

/**
 * Hook reutilizable para cámara trasera vía MediaDevices API.
 * Fallback: input nativo capture="environment" en mobile.
 */
export function useCamera() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const startingRef = useRef(false)
  const fileInputRef = useRef(null)

  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [useNativeFallback, setUseNativeFallback] = useState(false)
  const statusRef = useRef('idle')

  useEffect(() => {
    statusRef.current = status
  }, [status])

  const attachToVideo = useCallback(async () => {
    if (videoRef.current && streamRef.current) {
      await attachStreamToVideo(videoRef.current, streamRef.current)
    }
  }, [])

  const videoCallbackRef = useCallback((node) => {
    videoRef.current = node
    if (node && streamRef.current) {
      attachStreamToVideo(node, streamRef.current).catch(() => {
        // retry on next frame if autoplay blocked briefly
      })
    }
  }, [])

  const stop = useCallback(() => {
    cleanupMediaStream(streamRef, videoRef)
    setStatus((current) => (current === 'denied' ? 'denied' : 'idle'))
    startingRef.current = false
  }, [])

  const enableNativeFallback = useCallback(() => {
    captureLog.info('using native camera fallback')
    setUseNativeFallback(true)
    setStatus('native')
    setError(null)
    stop()
  }, [stop])

  const start = useCallback(async () => {
    if (startingRef.current) return
    startingRef.current = true

    if (getQaState().forcePermissionDenied) {
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

    stop()
    setUseNativeFallback(false)
    setStatus('loading')
    setError(null)

    try {
      const stream = await getRearCameraStream()
      streamRef.current = stream
      await attachToVideo()
      setStatus('active')
    } catch (err) {
      if (isPermissionDeniedError(err)) {
        setStatus('denied')
        setError('PERMISSION_DENIED')
        setUseNativeFallback(false)
      } else {
        enableNativeFallback()
      }
    } finally {
      startingRef.current = false
    }
  }, [attachToVideo, enableNativeFallback, stop])

  const wasActiveRef = useRef(false)

  useAppLifecycle({
    onHidden: () => {
      wasActiveRef.current =
        statusRef.current === 'active' || statusRef.current === 'loading'
      stop()
    },
    onVisible: () => {
      if (wasActiveRef.current && !useNativeFallback) {
        start()
      }
    },
  })

  useEffect(() => {
    return () => {
      cleanupMediaStream(streamRef, videoRef)
      startingRef.current = false
    }
  }, [])

  const openNativePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return {
    videoRef: videoCallbackRef,
    fileInputRef,
    getVideoElement: () => videoRef.current,
    status,
    error,
    useNativeFallback,
    isReady: status === 'active' || status === 'native',
    isDenied: status === 'denied',
    isLoading: status === 'loading',
    start,
    stop,
    openNativePicker,
  }
}
