import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { isMapFreeCameraEnabled } from '../../config/mapCamera'

const STORAGE_KEY = 'album-map-free-camera'

function readSnapshot(location) {
  let storage = '(unreadable)'
  try {
    storage = sessionStorage.getItem(STORAGE_KEY) ?? '(null)'
  } catch {
    storage = '(error)'
  }

  return {
    href: typeof window !== 'undefined' ? window.location.href : '—',
    search: typeof window !== 'undefined' ? window.location.search : '—',
    pathname: location.pathname,
    enabled: isMapFreeCameraEnabled(),
    storage,
  }
}

/**
 * Panel temporal: auditar si ?map_free_camera=1 sobrevive la navegación real.
 */
export function MapFreeCameraUrlDebug({ label = 'URL audit' }) {
  const location = useLocation()
  const [snapshot, setSnapshot] = useState(() => readSnapshot(location))

  useEffect(() => {
    setSnapshot(readSnapshot(location))
  }, [location.pathname, location.search, location.key, location])

  return (
    <div
      className="pointer-events-none fixed right-0 top-8 z-[2147483646] max-w-[min(100vw,22rem)] border border-amber-400/60 bg-amber-950/95 px-2 py-2 font-mono text-[10px] leading-snug text-amber-50 shadow-lg"
      role="status"
      aria-live="polite"
    >
      <p className="mb-1 font-bold uppercase tracking-wide text-amber-200">{label}</p>
      <p className="break-all">
        <span className="text-amber-300">href:</span> {snapshot.href}
      </p>
      <p className="mt-1 break-all">
        <span className="text-amber-300">search:</span>{' '}
        {snapshot.search || '(vacío)'}
      </p>
      <p className="mt-1">
        <span className="text-amber-300">pathname:</span> {snapshot.pathname}
      </p>
      <p className="mt-1 font-bold">
        isMapFreeCameraEnabled() ={' '}
        <span className={snapshot.enabled ? 'text-green-300' : 'text-red-300'}>
          {String(snapshot.enabled)}
        </span>
      </p>
      <p className="mt-1 break-all">
        <span className="text-amber-300">sessionStorage[{STORAGE_KEY}]:</span>{' '}
        {snapshot.storage}
      </p>
    </div>
  )
}
