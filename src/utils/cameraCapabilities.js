import { isCameraSupported } from './camera'
import { isMobileDevice } from './device'

export const EMBEDDED_CAMERA_INIT_TIMEOUT_MS = 12_000

function detectIOS() {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent ?? '')
}

function detectAndroid() {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent ?? '')
}

function detectSafari() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent ?? ''
  return /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/i.test(ua)
}

function detectSecureContext() {
  if (typeof window === 'undefined') return false
  return window.isSecureContext === true
}

function detectNativeFileCapture() {
  if (typeof document === 'undefined') return false
  const input = document.createElement('input')
  input.type = 'file'
  return 'capture' in input
}

/**
 * Capacidades de cámara en runtime. Embedded first; native solo como fallback.
 */
export function getCameraCapabilities() {
  const isMobile = isMobileDevice()
  const isIOS = detectIOS()
  const isAndroid = detectAndroid()
  const isSafari = detectSafari()
  const hasGetUserMedia = isCameraSupported()
  const isSecureContext = detectSecureContext()
  const hasNativeFileCapture = detectNativeFileCapture()

  const canTryEmbedded =
    hasGetUserMedia && isSecureContext && typeof navigator?.mediaDevices?.getUserMedia === 'function'

  return {
    isMobile,
    isIOS,
    isAndroid,
    isSafari,
    hasGetUserMedia,
    isSecureContext,
    hasNativeFileCapture,
    canTryEmbedded,
    prefersEmbeddedFirst: canTryEmbedded,
    embeddedInitTimeoutMs: EMBEDDED_CAMERA_INIT_TIMEOUT_MS,
  }
}

export function shouldTryEmbeddedCameraFirst() {
  return getCameraCapabilities().canTryEmbedded
}

export function shouldOfferNativeFallback() {
  const caps = getCameraCapabilities()
  return caps.hasNativeFileCapture
}

export function getNativeFallbackMessage(reason) {
  switch (reason) {
    case 'black_preview':
      return 'Ajustamos la captura para tu dispositivo. Seguí la señal del aro.'
    case 'permission_denied':
      return 'Usamos la cámara del celular para completar la captura.'
    case 'timeout':
      return 'La vista previa tardó en iniciar. Podés capturar igual desde acá.'
    case 'unsupported':
      return 'Tu navegador usa la cámara del dispositivo para esta captura.'
    case 'manual':
      return 'Usamos la cámara del dispositivo para esta captura.'
    case 'stream_failed':
    default:
      return 'Preparamos otra forma de capturar sin perder la experiencia.'
  }
}

export function mapCameraErrorToFallbackReason(error) {
  if (!error) return 'stream_failed'
  if (
    error.name === 'NotAllowedError' ||
    error.name === 'PermissionDeniedError' ||
    error.message === 'Permission denied'
  ) {
    return 'permission_denied'
  }
  if (error.message === 'CAMERA_UNSUPPORTED') return 'unsupported'
  if (error.message?.endsWith('_TIMEOUT')) return 'timeout'
  return 'stream_failed'
}
