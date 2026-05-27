import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import {
  routeTrace,
  setPreviousRoute,
  updateCurrentRoute,
} from '../utils/capturePipelineTrace'

/**
 * Observa commits de ruta (pathname + search) para correlacionar crash post-unlock.
 */
export function RoutePipelineObserver() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const previousPathRef = useRef(null)

  useEffect(() => {
    const path = `${location.pathname}${location.search}`
    const previous = previousPathRef.current

    if (previous !== path) {
      if (previous) {
        setPreviousRoute(previous)
      }
      updateCurrentRoute(path)
      routeTrace('location commit', {
        path,
        navigationType,
        previousRoute: previous,
      })
      previousPathRef.current = path
    }
  }, [location.pathname, location.search, navigationType])

  return null
}
