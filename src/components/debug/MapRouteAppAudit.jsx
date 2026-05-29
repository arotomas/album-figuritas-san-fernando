import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { MapDebugMountedBanner, MapTreeDebugPanel } from './MapTreeDebugOverlay'
import { recordMapNavStep } from './mapNavAudit'

/**
 * Monta en App cuando el router declara /map (aunque MapScreen siga en Suspense).
 */
export function MapRouteAppAudit() {
  const location = useLocation()
  const onMapRoute =
    location.pathname === '/map' || location.pathname.startsWith('/map/')

  useEffect(() => {
    recordMapNavStep(`App route: ${location.pathname}`, location)
  }, [location.pathname, location.search, location.key])

  if (!onMapRoute) return null

  return (
    <>
      <MapDebugMountedBanner source="App router /map" stackIndex={0} />
      <MapTreeDebugPanel source="App router /map" placement="right" stackIndex={0} />
    </>
  )
}
