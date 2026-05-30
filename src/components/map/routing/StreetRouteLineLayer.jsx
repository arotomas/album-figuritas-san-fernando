import { memo, useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { EXPLORATION_LINE_UPDATE_MIN_M } from '../../../config/exploration'
import { SIMPLE_ROUTING_EXPERIMENT } from '../../../config/simpleRoutingExperiment'
import { STREET_ROUTING_OSRM_EXPERIMENT } from '../../../config/streetRoutingOsrmExperiment'
import { getDistanceMeters } from '../../../utils/geo'
import { estimateWalkingDurationSeconds, fetchOsrmWalkingRoute } from '../../../utils/osrmRoute'

const STREET_ROUTE_PANE = 'streetRoutePane'

function ensureStreetRoutePane(map) {
  if (map.getPane(STREET_ROUTE_PANE)) return STREET_ROUTE_PANE

  const pane = map.createPane(STREET_ROUTE_PANE)
  pane.style.zIndex = '515'
  return STREET_ROUTE_PANE
}

function StreetRouteLineLayerInner({
  active,
  userPosition,
  targetCoordinates,
  onRouteMetricsChange,
}) {
  const map = useMap()
  const lineRef = useRef(null)
  const lastRequestRef = useRef(null)
  const lineStyle = SIMPLE_ROUTING_EXPERIMENT.line

  useEffect(() => {
    const removeLine = () => {
      if (!lineRef.current) return
      map.removeLayer(lineRef.current)
      lineRef.current = null
    }

    const guardFailed =
      !active ||
      !userPosition?.lat ||
      !userPosition?.lng ||
      !targetCoordinates?.lat ||
      !targetCoordinates?.lng

    if (guardFailed) {
      removeLine()
      lastRequestRef.current = null
      onRouteMetricsChange?.(null)
      return undefined
    }

    const from = { lat: userPosition.lat, lng: userPosition.lng }
    const to = { lat: targetCoordinates.lat, lng: targetCoordinates.lng }

    const last = lastRequestRef.current
    if (last) {
      const movedUser = getDistanceMeters(last.from.lat, last.from.lng, from.lat, from.lng)
      const movedTarget = getDistanceMeters(last.to.lat, last.to.lng, to.lat, to.lng)
      if (
        movedUser != null &&
        movedUser < EXPLORATION_LINE_UPDATE_MIN_M &&
        movedTarget != null &&
        movedTarget < EXPLORATION_LINE_UPDATE_MIN_M
      ) {
        return undefined
      }
    }

    lastRequestRef.current = { from, to }

    const abortController = new AbortController()
    let cancelled = false

    const drawLatLngs = (latlngs, metrics) => {
      if (cancelled) return

      const pane = ensureStreetRoutePane(map)
      if (!lineRef.current) {
        lineRef.current = L.polyline(latlngs, {
          color: lineStyle.color,
          weight: lineStyle.weight,
          opacity: lineStyle.opacity,
          dashArray: lineStyle.dashArray ?? undefined,
          lineCap: 'round',
          lineJoin: 'round',
          className: 'street-route-line',
          interactive: false,
          pane,
        }).addTo(map)
      } else {
        lineRef.current.setLatLngs(latlngs)
      }

      onRouteMetricsChange?.(metrics)
    }

    const drawStraightFallback = () => {
      const latlngs = [
        [from.lat, from.lng],
        [to.lat, to.lng],
      ]
      const distanceMeters = getDistanceMeters(from.lat, from.lng, to.lat, to.lng)
      drawLatLngs(latlngs, {
        distanceMeters,
        durationSeconds: estimateWalkingDurationSeconds(distanceMeters),
        source: 'straight',
      })
    }

    ;(async () => {
      try {
        const route = await fetchOsrmWalkingRoute(from, to, {
          baseUrl: STREET_ROUTING_OSRM_EXPERIMENT.baseUrl,
          profile: STREET_ROUTING_OSRM_EXPERIMENT.profile,
          signal: abortController.signal,
        })
        drawLatLngs(route.latlngs, {
          distanceMeters: route.distanceMeters,
          durationSeconds: route.durationSeconds,
          source: 'osrm',
        })
      } catch (error) {
        if (cancelled || error?.name === 'AbortError') return
        if (STREET_ROUTING_OSRM_EXPERIMENT.fallbackToStraightLine) {
          drawStraightFallback()
          return
        }
        removeLine()
        onRouteMetricsChange?.(null)
      }
    })()

    return () => {
      cancelled = true
      abortController.abort()
      removeLine()
    }
  }, [
    active,
    lineStyle.color,
    lineStyle.dashArray,
    lineStyle.opacity,
    lineStyle.weight,
    map,
    onRouteMetricsChange,
    targetCoordinates?.lat,
    targetCoordinates?.lng,
    userPosition?.lat,
    userPosition?.lng,
  ])

  return null
}

export const StreetRouteLineLayer = memo(StreetRouteLineLayerInner)
