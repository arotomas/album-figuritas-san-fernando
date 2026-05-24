import { lazy, memo, Suspense, useCallback, useEffect, useState } from 'react'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa6'
import { getAdminPlayerMapMarkers } from '../../../services/supabase/adminPlayers'
import { isAbortError, normalizeAdminError } from '../../../utils/adminAsync'
import { useLatestRequest } from '../../../hooks/useLatestRequest'
import { AdminInlineError } from './AdminPlayersUi'

const LazyDistributionMap = lazy(() =>
  import('../AdminPlayerLocationMap').then((module) => ({
    default: module.AdminPlayersDistributionMap,
  })),
)

export const AdminPlayersMapSection = memo(function AdminPlayersMapSection() {
  const mapRequest = useLatestRequest()
  const [expanded, setExpanded] = useState(false)
  const [markers, setMarkers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mapMounted, setMapMounted] = useState(false)

  const loadMarkers = useCallback(() => {
    const { id, signal } = mapRequest.begin()
    setLoading(true)
    setError(null)

    getAdminPlayerMapMarkers({ signal })
      .then((data) => {
        if (!mapRequest.isLatest(id)) return
        setMarkers(data ?? [])
        setMapMounted(true)
      })
      .catch((loadError) => {
        if (isAbortError(loadError) || !mapRequest.isLatest(id)) return
        setError(normalizeAdminError(loadError))
      })
      .finally(() => {
        if (mapRequest.isLatest(id)) setLoading(false)
      })
  }, [mapRequest])

  useEffect(() => {
    if (!expanded) {
      mapRequest.cancelAll()
      setMapMounted(false)
      setMarkers([])
      setLoading(false)
      setError(null)
      return undefined
    }

    loadMarkers()
    return undefined
  }, [expanded, loadMarkers, mapRequest])

  const toggleExpanded = useCallback(() => {
    setExpanded((current) => !current)
  }, [])

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <button
        type="button"
        onClick={toggleExpanded}
        aria-expanded={expanded}
        aria-controls="admin-players-map-panel"
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400"
      >
        <div>
          <h3 className="text-sm font-black text-ink">Distribución de domicilios</h3>
          <p className="mt-0.5 text-xs text-muted">Vista secundaria — Leaflet se carga solo al expandir.</p>
        </div>
        <span className="flex items-center gap-2 text-xs font-bold text-muted">
          {expanded ? 'Ocultar' : 'Mostrar'}
          {expanded ? <FaChevronUp aria-hidden="true" /> : <FaChevronDown aria-hidden="true" />}
        </span>
      </button>

      {expanded && (
        <div id="admin-players-map-panel" className="border-t border-border px-5 pb-5">
          {loading && (
            <div className="mt-4 h-[280px] animate-pulse rounded-2xl bg-slate-100" aria-hidden="true" />
          )}
          {error && !loading && (
            <div className="mt-4">
              <AdminInlineError message={error} onRetry={loadMarkers} />
            </div>
          )}
          {!loading && !error && mapMounted && (
            <Suspense fallback={<div className="mt-4 h-[280px] animate-pulse rounded-2xl bg-slate-100" />}>
              <LazyDistributionMap players={markers} className="mt-4 h-[280px]" />
            </Suspense>
          )}
        </div>
      )}
    </section>
  )
})
