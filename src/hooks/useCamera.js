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

/**
 * Hook reutilizable para cámara trasera vía MediaDevices API.
 * Detiene streams previos, limpia al desmontar y recupera desde background.
 */
export function useCamera() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const startingRef = useRef(false)

  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
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
    setStatus('idle')
    startingRef.current = false
  }, [])

  const start = useCallback(async () => {
    if (startingRef.current) return
    startingRef.current = true

    if (getQaState().forcePermissionDenied) {
      setStatus('denied')
      setError('PERMISSION_DENIED')
      startingRef.current = false
      return
    }

    if (!isCameraSupported()) {
      setStatus('error')
      setError('CAMERA_UNSUPPORTED')
      startingRef.current = false
      return
    }

    stop()
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
      } else {
        setStatus('error')
        setError(err.message || 'No se pudo abrir la cámara.')
      }
    } finally {
      startingRef.current = false
    }
  }, [attachToVideo, stop])

  const wasActiveRef = useRef(false)

  useAppLifecycle({
    onHidden: () => {
      wasActiveRef.current =
        statusRef.current === 'active' || statusRef.current === 'loading'
      stop()
    },
    onVisible: () => {
      if (wasActiveRef.current) {
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

  return {
    videoRef: videoCallbackRef,
    getVideoElement: () => videoRef.current,
    status,
    error,
    isReady: status === 'active',
    isDenied: status === 'denied',
    isLoading: status === 'loading',
    start,
    stop,
  }
}
