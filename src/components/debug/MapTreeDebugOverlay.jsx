import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { isMapFreeCameraEnabled } from '../../config/mapCamera'
import { readMapNavAuditTrail } from './mapNavAudit'

const STORAGE_KEY = 'album-map-free-camera'

const PORTAL_STYLE = { position: 'fixed', zIndex: 2147483646 }

function readSnapshot(location, freePanMode) {
  let storage = '(unreadable)'
  try {
    storage = sessionStorage.getItem(STORAGE_KEY) ?? '(null)'
  } catch {
    storage = '(error)'
  }

  const enabled = isMapFreeCameraEnabled()
  const resolvedFreePan =
    freePanMode === undefined ? enabled : Boolean(freePanMode)

  return {
    origin: typeof window !== 'undefined' ? window.location.origin : '—',
    href: typeof window !== 'undefined' ? window.location.href : '—',
    search: typeof window !== 'undefined' ? window.location.search : '—',
    pathname: location.pathname,
    routerPathname: location.pathname,
    enabled,
    storage,
    freePanMode: resolvedFreePan,
    navTrail: readMapNavAuditTrail(),
  }
}

function useMapDebugSnapshot(location, freePanMode) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  return readSnapshot(location, freePanMode)
}

/** Banner rojo: prueba irrefutable de que este componente montó. */
export function MapDebugMountedBanner({ source, stackIndex = 0 }) {
  const location = useLocation()
  const mountRef = useRef(0)
  mountRef.current += 1

  const banner = (
    <div
      style={{ ...PORTAL_STYLE, top: 24 + stackIndex * 28, left: 0, right: 0 }}
      className="pointer-events-none border-b-4 border-black bg-red-600 px-2 py-2 text-center font-mono text-xs font-black uppercase tracking-wide text-white shadow-lg"
      role="status"
    >
      MAP DEBUG MOUNTED — {source} (mount #{mountRef.current}) · router=
      {location.pathname}
      {location.search || ''}
    </div>
  )

  if (typeof document === 'undefined') return banner
  return createPortal(banner, document.body)
}

/** Panel ámbar con todos los valores que lee el árbol del mapa. */
export function MapTreeDebugPanel({
  source,
  placement = 'left',
  freePanMode,
  stackIndex = 0,
}) {
  const location = useLocation()
  const mountRef = useRef(0)
  mountRef.current += 1
  const snapshot = useMapDebugSnapshot(location, freePanMode)

  const horizontal =
    placement === 'right'
      ? { right: 0, left: 'auto' }
      : { left: 0, right: 'auto' }

  const panel = (
    <div
      style={{
        ...PORTAL_STYLE,
        top: 88 + stackIndex * 120,
        maxWidth: 'min(100vw, 22rem)',
        ...horizontal,
      }}
      className="pointer-events-none border border-amber-400/80 bg-amber-950 px-2 py-2 font-mono text-[10px] leading-snug text-amber-50 shadow-lg"
      role="status"
      aria-live="polite"
    >
      <p className="font-bold uppercase text-amber-200">{source}</p>
      <p className="text-[9px] text-amber-300/90">panel mount #{mountRef.current}</p>
      <p className="mt-1 break-all">
        <span className="text-amber-300">origin:</span> {snapshot.origin}
      </p>
      <p className="mt-1 break-all">
        <span className="text-amber-300">href:</span> {snapshot.href}
      </p>
      <p className="mt-1">
        <span className="text-amber-300">pathname:</span> {snapshot.pathname}
      </p>
      <p className="mt-1 break-all">
        <span className="text-amber-300">search:</span>{' '}
        {snapshot.search || '(vacío)'}
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
      <p className="mt-1 font-bold text-cyan-200">
        freePanMode = {String(snapshot.freePanMode)}
      </p>
      <p className="mt-2 text-[9px] font-bold uppercase text-amber-300">
        Nav trail (login → map)
      </p>
      {snapshot.navTrail.length === 0 ? (
        <p className="text-amber-200/80">(sin pasos registrados)</p>
      ) : (
        snapshot.navTrail.slice(-4).map((step) => (
          <p key={`${step.t}-${step.label}`} className="mt-1 break-all text-[9px]">
            {step.label}: {step.pathname}
            {step.search || ''}
          </p>
        ))
      )}
    </div>
  )

  if (typeof document === 'undefined') return panel
  return createPortal(panel, document.body)
}

/** Banner + panel (MapScreen / LeafletMapView). */
export function MapTreeDebugStack({
  source,
  placement = 'left',
  freePanMode,
  stackIndex = 0,
}) {
  return (
    <>
      <MapDebugMountedBanner source={source} stackIndex={stackIndex} />
      <MapTreeDebugPanel
        source={source}
        placement={placement}
        freePanMode={freePanMode}
        stackIndex={stackIndex}
      />
    </>
  )
}
