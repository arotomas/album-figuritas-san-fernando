import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
    origin: typeof window !== 'undefined' ? window.location.origin : '—',
    href: typeof window !== 'undefined' ? window.location.href : '—',
    search: typeof window !== 'undefined' ? window.location.search : '—',
    pathname: location.pathname,
    enabled: isMapFreeCameraEnabled(),
    storage,
  }
}

/**
 * Panel temporal: auditar flag map_free_camera en navegación real.
 * Portal a document.body para no quedar oculto por overflow del mapa.
 */
export function MapFreeCameraUrlDebug({
  label = 'URL audit',
  placement = 'top-right',
  extraLines = [],
}) {
  const location = useLocation()
  const mountRef = useRef(0)
  mountRef.current += 1

  const [snapshot, setSnapshot] = useState(() => readSnapshot(location))
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setSnapshot(readSnapshot(location))
  }, [location.pathname, location.search, location.key, location, tick])

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((value) => value + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  const positionClass =
    placement === 'map-bottom'
      ? 'fixed left-0 bottom-[5.5rem] z-[2147483647]'
      : placement === 'map-bottom-right'
        ? 'fixed right-0 bottom-[5.5rem] z-[2147483647]'
        : 'fixed right-0 top-8 z-[2147483647]'

  const panel = (
    <div
      className={`pointer-events-none ${positionClass} max-w-[min(100vw,22rem)] border border-amber-400/60 bg-amber-950/95 px-2 py-2 font-mono text-[10px] leading-snug text-amber-50 shadow-lg`}
      role="status"
      aria-live="polite"
    >
      <p className="mb-1 font-bold uppercase tracking-wide text-amber-200">{label}</p>
      <p className="text-[9px] text-amber-300/90">mount #{mountRef.current}</p>
      <p className="mt-1 break-all">
        <span className="text-amber-300">origin:</span> {snapshot.origin}
      </p>
      <p className="mt-1 break-all">
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
      {extraLines.map((line) => (
        <p key={line} className="mt-1 font-bold text-cyan-200">
          {line}
        </p>
      ))}
    </div>
  )

  if (typeof document === 'undefined') return panel
  return createPortal(panel, document.body)
}
