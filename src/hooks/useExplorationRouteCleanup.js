import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useExplorationStore } from '../store/explorationStore'

/**
 * Detiene exploración solo al salir de /map (no en unmount efímero de StrictMode).
 */
export function useExplorationRouteCleanup() {
  const location = useLocation()
  const pathnameRef = useRef(location.pathname)

  useEffect(() => {
    const previous = pathnameRef.current
    const current = location.pathname
    pathnameRef.current = current

    const wasOnMap = previous.startsWith('/map')
    const isOnMap = current.startsWith('/map')

    if (wasOnMap && !isOnMap) {
      useExplorationStore.getState().stopExploration()
    }
  }, [location.pathname])
}
