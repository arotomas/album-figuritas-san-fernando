import { memo, useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { EXPLORATION_LINE_UPDATE_MIN_M } from '../../../config/exploration'
import { NAVIGATION_UX_EXPERIMENT, OSRM_PROFILE_BY_MODE } from '../../../config/navigationUx'
import { SIMPLE_ROUTING_EXPERIMENT } from '../../../config/simpleRoutingExperiment'
import { STREET_ROUTING_OSRM_EXPERIMENT } from '../../../config/streetRoutingOsrmExperiment'
import { useNavigationStore } from '../../../store/navigationStore'
import { getDistanceMeters } from '../../../utils/geo'
import {
  estimateDurationSecondsForProfile,
  fetchOsrmWalkingRoute,
} from '../../../utils/osrmRoute'

/** Producción: pin de destino vía RouteDestinationMarker; círculos solo en DEV explícito. */
const ROUTE_END_DIAGNOSTIC_CIRCLES = import.meta.env.DEV && false

/** Android-safe: overlayPane estándar (sin pane custom). */
const ROUTE_PANE = 'overlayPane'

function getLastRenderedLatLng(line) {
  if (!line?.getLatLngs) return null
  const latlngs = line.getLatLngs()
  if (!Array.isArray(latlngs) || latlngs.length === 0) return null

  const last = latlngs[latlngs.length - 1]
  if (Array.isArray(last)) {
    return { lat: last[0], lng: last[1] }
  }
  return { lat: last.lat, lng: last.lng }
}

function measurePolylinePathMeters(latlngs) {
  if (!Array.isArray(latlngs) || latlngs.length < 2) return 0

  let total = 0
  for (let i = 1; i < latlngs.length; i += 1) {
    const [lat1, lng1] = latlngs[i - 1]
    const [lat2, lng2] = latlngs[i]
    const segment = getDistanceMeters(lat1, lng1, lat2, lng2)
    if (segment != null) total += segment
  }
  return total
}

function withUserOriginAnchor(latlngs, from) {
  if (!Array.isArray(latlngs) || latlngs.length === 0 || !from) return latlngs

  const [firstLat, firstLng] = latlngs[0]
  const gapMeters = getDistanceMeters(from.lat, from.lng, firstLat, firstLng)
  if (gapMeters != null && gapMeters > 2) {
    return [[from.lat, from.lng], ...latlngs]
  }
  return latlngs
}

/** Umbral para omitir el primer vértice OSRM duplicado cerca del GPS. */
const ROUTE_ORIGIN_DEDUPE_METERS = 25

function normalizeOsrmLatLngs(latlngs) {
  if (!Array.isArray(latlngs)) return []
  return latlngs.map((pt) => (Array.isArray(pt) ? pt : [pt.lat, pt.lng]))
}

/**
 * Geometría visible: inicio en GPS actual, fin en targetCoordinates (círculo rojo).
 * No modifica la geometría OSRM almacenada ni dispara nuevos requests.
 */
function buildLiveRenderLatLngs(
  osrmLatlngs,
  userPosition,
  targetCoordinates,
  anchorFrom = userPosition,
) {
  if (!Array.isArray(osrmLatlngs) || osrmLatlngs.length === 0) return osrmLatlngs

  let body = normalizeOsrmLatLngs(osrmLatlngs)

  if (userPosition?.lat != null && userPosition?.lng != null) {
    if (body.length > 0) {
      const gapToFirst = getDistanceMeters(
        userPosition.lat,
        userPosition.lng,
        body[0][0],
        body[0][1],
      )
      if (gapToFirst != null && gapToFirst < ROUTE_ORIGIN_DEDUPE_METERS) {
        body = body.slice(1)
      }
    }
    body =
      body.length > 0
        ? [[userPosition.lat, userPosition.lng], ...body]
        : [[userPosition.lat, userPosition.lng]]
  } else if (anchorFrom?.lat != null && anchorFrom?.lng != null) {
    body = normalizeOsrmLatLngs(withUserOriginAnchor(osrmLatlngs, anchorFrom))
  }

  if (
    targetCoordinates?.lat != null &&
    targetCoordinates?.lng != null &&
    body.length > 0
  ) {
    const targetPoint = [targetCoordinates.lat, targetCoordinates.lng]
    body =
      body.length === 1
        ? [targetPoint]
        : [...body.slice(0, -1), targetPoint]
  }

  return body
}

function logRoutePane(map, paneName) {
  if (!import.meta.env.DEV) return
  const paneEl = map.getPane(paneName)
  console.info('[ROUTE_PANE]', {
    pane: paneName,
    customPane: paneName !== 'overlayPane',
    zIndex: paneEl?.style?.zIndex ?? null,
    computedZIndex: paneEl ? getComputedStyle(paneEl).zIndex : null,
    childCount: paneEl?.childElementCount ?? null,
    preferCanvas: Boolean(map._renderer?.options?.preferCanvas),
  })
}

function logRouteLayer(map, line, latlngs, metrics, requestFrom, requestTo, { updated = false } = {}) {
  if (!import.meta.env.DEV) return
  const bounds = line?.getBounds?.()
  const southWest = bounds?.getSouthWest?.()
  const northEast = bounds?.getNorthEast?.()
  const renderedPathMeters = measurePolylinePathMeters(latlngs)
  const first = latlngs[0] ?? null
  const last = latlngs[latlngs.length - 1] ?? null

  console.info('[ROUTE_POINTS_RENDERED]', latlngs.length)
  console.info('[ROUTE_FIRST_RENDERED]', first)
  console.info('[ROUTE_LAST_RENDERED]', last)
  console.info('[ROUTE_BOUNDS_RENDERED]', {
    southWest: southWest ? { lat: southWest.lat, lng: southWest.lng } : null,
    northEast: northEast ? { lat: northEast.lat, lng: northEast.lng } : null,
    isValid: bounds?.isValid?.() ?? null,
  })
  console.info('[ROUTE_DISTANCE_COMPARE_RENDERED]', {
    osrmDistanceMeters: metrics?.distanceMeters ?? null,
    renderedPathMeters,
    deltaMeters:
      metrics?.distanceMeters != null ? metrics.distanceMeters - renderedPathMeters : null,
    requestOrigin: requestFrom,
    requestDestination: requestTo,
    originToFirstMeters:
      first && requestFrom
        ? getDistanceMeters(requestFrom.lat, requestFrom.lng, first[0], first[1])
        : null,
    destinationToLastMeters:
      last && requestTo
        ? getDistanceMeters(requestTo.lat, requestTo.lng, last[0], last[1])
        : null,
    metricsSource: metrics?.source ?? null,
    updated,
  })
  console.info('[ROUTE_POINT_COUNT]', latlngs.length)
  console.info('[ROUTE_BOUNDS]', {
    southWest: southWest ? { lat: southWest.lat, lng: southWest.lng } : null,
    northEast: northEast ? { lat: northEast.lat, lng: northEast.lng } : null,
    isValid: bounds?.isValid?.() ?? null,
  })
  console.info('[ROUTE_LAYER_ADDED]', {
    pointCount: latlngs.length,
    first,
    last,
    pane: ROUTE_PANE,
    color: SIMPLE_ROUTING_EXPERIMENT.line.color,
    weight: SIMPLE_ROUTING_EXPERIMENT.line.weight,
    opacity: SIMPLE_ROUTING_EXPERIMENT.line.opacity,
    onMap: line ? map.hasLayer(line) : false,
    metricsSource: metrics?.source ?? null,
    updated,
  })
}

function StreetRouteLineLayerInner({
  active,
  userPosition,
  targetCoordinates,
  onRouteMetricsChange,
}) {
  const map = useMap()
  const lineRef = useRef(null)
  const routeRendererRef = useRef(null)
  const lastDrawRef = useRef(null)
  const osrmGeometryRef = useRef(null)
  const targetCircleRef = useRef(null)
  const routeEndCircleRef = useRef(null)
  const pendingFetchRef = useRef(null)
  const fetchSeqRef = useRef(0)
  const lineStyle = SIMPLE_ROUTING_EXPERIMENT.line
  const transportProfile = useNavigationStore((state) => state.transportProfile)
  const osrmProfile = NAVIGATION_UX_EXPERIMENT.enabled
    ? OSRM_PROFILE_BY_MODE[transportProfile] ?? 'walking'
    : STREET_ROUTING_OSRM_EXPERIMENT.profile

  useEffect(() => {
    if (!import.meta.env.DEV) return
    console.info('[ROUTE_LAYER_MOUNT]', {
      active,
      userLat: userPosition?.lat ?? null,
      userLng: userPosition?.lng ?? null,
      targetLat: targetCoordinates?.lat ?? null,
      targetLng: targetCoordinates?.lng ?? null,
      routePane: ROUTE_PANE,
    })
    logRoutePane(map, ROUTE_PANE)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const removeDiagnosticCircles = () => {
      targetCircleRef.current?.remove()
      routeEndCircleRef.current?.remove()
      targetCircleRef.current = null
      routeEndCircleRef.current = null
    }

    const syncDiagnosticCircles = (targetCoords) => {
      if (!ROUTE_END_DIAGNOSTIC_CIRCLES) {
        removeDiagnosticCircles()
        return
      }

      if (targetCoords?.lat == null || targetCoords?.lng == null) {
        removeDiagnosticCircles()
        return
      }

      const targetLatLng = [targetCoords.lat, targetCoords.lng]
      if (!targetCircleRef.current) {
        targetCircleRef.current = L.circleMarker(targetLatLng, {
          radius: 10,
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.95,
          weight: 2,
          interactive: false,
        }).addTo(map)
      } else {
        targetCircleRef.current.setLatLng(targetLatLng)
      }

      const routeEnd = getLastRenderedLatLng(lineRef.current)
      if (!routeEnd) {
        routeEndCircleRef.current?.remove()
        routeEndCircleRef.current = null
        return
      }

      const routeEndLatLng = [routeEnd.lat, routeEnd.lng]
      if (!routeEndCircleRef.current) {
        routeEndCircleRef.current = L.circleMarker(routeEndLatLng, {
          radius: 10,
          color: '#22c55e',
          fillColor: '#22c55e',
          fillOpacity: 0.95,
          weight: 2,
          interactive: false,
        }).addTo(map)
      } else {
        routeEndCircleRef.current.setLatLng(routeEndLatLng)
      }
    }

    const removeLine = () => {
      if (!lineRef.current) return
      map.removeLayer(lineRef.current)
      lineRef.current = null
      osrmGeometryRef.current = null
      removeDiagnosticCircles()
    }

    const abortPendingFetch = () => {
      pendingFetchRef.current?.abortController?.abort()
      pendingFetchRef.current = null
    }

    const updateLiveRouteAnchor = (position) => {
      if (!lineRef.current || !osrmGeometryRef.current?.length) return
      if (position?.lat == null || position?.lng == null) return

      lineRef.current.setLatLngs(
        buildLiveRenderLatLngs(
          osrmGeometryRef.current,
          position,
          targetCoordinates,
        ),
      )
      syncDiagnosticCircles(targetCoordinates)
    }

    const guardFailed =
      !active ||
      !userPosition?.lat ||
      !userPosition?.lng ||
      !targetCoordinates?.lat ||
      !targetCoordinates?.lng

    if (guardFailed) {
      abortPendingFetch()
      removeLine()
      lastDrawRef.current = null
      onRouteMetricsChange?.(null)
      return undefined
    }

    const from = { lat: userPosition.lat, lng: userPosition.lng }
    const to = { lat: targetCoordinates.lat, lng: targetCoordinates.lng }
    const lastDraw = lastDrawRef.current
    const pendingFetch = pendingFetchRef.current

    let userMovedFromDraw = null
    let targetMovedFromDraw = null

    if (lastDraw) {
      userMovedFromDraw = getDistanceMeters(
        lastDraw.from.lat,
        lastDraw.from.lng,
        from.lat,
        from.lng,
      )
      targetMovedFromDraw = getDistanceMeters(
        lastDraw.to.lat,
        lastDraw.to.lng,
        to.lat,
        to.lng,
      )

      const profileUnchanged = lastDraw.profile === osrmProfile
      const userStale =
        userMovedFromDraw != null &&
        userMovedFromDraw >= EXPLORATION_LINE_UPDATE_MIN_M
      const targetStable =
        targetMovedFromDraw == null ||
        targetMovedFromDraw < EXPLORATION_LINE_UPDATE_MIN_M

      if (!userStale && targetStable && profileUnchanged) {
        updateLiveRouteAnchor(userPosition)
        return undefined
      }
    }

    if (pendingFetch) {
      const pendingUserMove = getDistanceMeters(
        pendingFetch.from.lat,
        pendingFetch.from.lng,
        from.lat,
        from.lng,
      )
      const pendingTargetMove = getDistanceMeters(
        pendingFetch.to.lat,
        pendingFetch.to.lng,
        to.lat,
        to.lng,
      )
      const pendingStillFresh =
        pendingFetch.profile === osrmProfile &&
        pendingUserMove != null &&
        pendingUserMove < EXPLORATION_LINE_UPDATE_MIN_M &&
        pendingTargetMove != null &&
        pendingTargetMove < EXPLORATION_LINE_UPDATE_MIN_M

      if (pendingStillFresh) {
        updateLiveRouteAnchor(userPosition)
        return undefined
      }
    }

    const targetChanged =
      targetMovedFromDraw != null &&
      targetMovedFromDraw >= EXPLORATION_LINE_UPDATE_MIN_M

    if (targetChanged) {
      abortPendingFetch()
      removeLine()
      lastDrawRef.current = null
      onRouteMetricsChange?.(null)
    } else {
      abortPendingFetch()
    }

    const drawLatLngs = (latlngs, metrics, requestFrom, requestTo) => {
      osrmGeometryRef.current = latlngs
      const renderLatLngs = buildLiveRenderLatLngs(
        latlngs,
        userPosition,
        requestTo,
        requestFrom,
      )

      if (!routeRendererRef.current) {
        routeRendererRef.current = L.svg({ padding: 0.5 })
      }

      logRoutePane(map, ROUTE_PANE)

      if (!lineRef.current) {
        if (import.meta.env.DEV) console.info('[ROUTE_RENDERER]', { type: 'SVG' })
        lineRef.current = L.polyline(renderLatLngs, {
          color: lineStyle.color,
          weight: lineStyle.weight,
          opacity: lineStyle.opacity,
          dashArray: lineStyle.dashArray ?? undefined,
          lineCap: 'round',
          lineJoin: 'round',
          className: 'street-route-line',
          interactive: false,
          pane: ROUTE_PANE,
          renderer: routeRendererRef.current,
        }).addTo(map)
        logRouteLayer(map, lineRef.current, renderLatLngs, metrics, requestFrom, requestTo)
      } else {
        lineRef.current.setLatLngs(renderLatLngs)
        logRouteLayer(map, lineRef.current, renderLatLngs, metrics, requestFrom, requestTo, {
          updated: true,
        })
      }

      lastDrawRef.current = { from: requestFrom, to: requestTo, profile: osrmProfile }
      onRouteMetricsChange?.({
        ...metrics,
        profile: osrmProfile,
      })
      syncDiagnosticCircles(requestTo)
    }

    const drawStraightFallback = (requestFrom, requestTo) => {
      const latlngs = [
        [requestFrom.lat, requestFrom.lng],
        [requestTo.lat, requestTo.lng],
      ]
      const distanceMeters = getDistanceMeters(
        requestFrom.lat,
        requestFrom.lng,
        requestTo.lat,
        requestTo.lng,
      )
      drawLatLngs(latlngs, {
        distanceMeters,
        durationSeconds: estimateDurationSecondsForProfile(distanceMeters, osrmProfile),
        source: 'straight',
        profile: osrmProfile,
      }, requestFrom, requestTo)
    }

    const fetchSeq = ++fetchSeqRef.current
    const abortController = new AbortController()
    pendingFetchRef.current = {
      from,
      to,
      abortController,
      seq: fetchSeq,
      profile: osrmProfile,
    }

    if (import.meta.env.DEV) {
      console.info('[ROUTE_REFETCH]', {
        reason: lastDraw ? 'stale_or_target' : 'initial',
        userMovedFromDrawMeters: userMovedFromDraw,
        targetMovedFromDrawMeters: targetMovedFromDraw,
        from,
        to,
        keepExistingLine: Boolean(lineRef.current) && !targetChanged,
      })
    }

    ;(async () => {
      try {
        const route = await fetchOsrmWalkingRoute(from, to, {
          baseUrl: STREET_ROUTING_OSRM_EXPERIMENT.baseUrl,
          profile: osrmProfile,
          signal: abortController.signal,
        })

        if (fetchSeq !== fetchSeqRef.current) return

        drawLatLngs(route.latlngs, {
          distanceMeters: route.distanceMeters,
          durationSeconds: route.durationSeconds,
          source: 'osrm',
          profile: route.profile ?? osrmProfile,
        }, from, to)

        if (pendingFetchRef.current?.seq === fetchSeq) {
          pendingFetchRef.current = null
        }
      } catch (error) {
        if (error?.name === 'AbortError') return
        if (fetchSeq !== fetchSeqRef.current) return

        if (STREET_ROUTING_OSRM_EXPERIMENT.fallbackToStraightLine) {
          drawStraightFallback(from, to)
          if (pendingFetchRef.current?.seq === fetchSeq) {
            pendingFetchRef.current = null
          }
          return
        }

        if (!lineRef.current) {
          onRouteMetricsChange?.(null)
        }

        if (pendingFetchRef.current?.seq === fetchSeq) {
          pendingFetchRef.current = null
        }
      }
    })()

    return undefined
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
    osrmProfile,
  ])

  useEffect(() => {
    return () => {
      pendingFetchRef.current?.abortController?.abort()
      pendingFetchRef.current = null
      fetchSeqRef.current += 1

      if (!lineRef.current) return
      map.removeLayer(lineRef.current)
      lineRef.current = null
      lastDrawRef.current = null
      osrmGeometryRef.current = null
      targetCircleRef.current?.remove()
      routeEndCircleRef.current?.remove()
      targetCircleRef.current = null
      routeEndCircleRef.current = null
    }
  }, [map])

  return null
}

export const StreetRouteLineLayer = memo(StreetRouteLineLayerInner)
