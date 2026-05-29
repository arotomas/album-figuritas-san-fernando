import { useLocation } from 'react-router-dom'
import { appBuildInfo } from '../../build/appBuildInfo'
import { isMapFreeCameraEnabled } from '../../config/mapCamera'

const STORAGE_KEY = 'album-map-free-camera'

function readStorageValue() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? '(null)'
  } catch {
    return '(unreadable)'
  }
}

export function BuildShaBadge() {
  const location = useLocation()
  const freeCamera = isMapFreeCameraEnabled()
  const storage = readStorageValue()

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[2147483647] max-w-[min(100vw,20rem)] border-b border-r border-white/25 bg-black px-2 py-1 font-mono text-[10px] font-bold leading-snug text-white shadow-lg"
      role="status"
      aria-live="polite"
    >
      <div>BUILD SHA: {appBuildInfo.shaShort}</div>
      <div>PATH: {location.pathname}</div>
      <div>FREE CAMERA: {freeCamera ? 'TRUE' : 'FALSE'}</div>
      <div className="break-all">STORAGE: {storage}</div>
    </div>
  )
}
