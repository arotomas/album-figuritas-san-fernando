import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminMap } from '../../components/admin/AdminMap'
import { getFiguresAdmin, getRecentCaptures } from '../../services/supabase/adminDashboard'
import { AdminErrorBanner } from '../../components/admin/adminShared'

export function AdminMapPage() {
  const [figures, setFigures] = useState([])
  const [captures, setCaptures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadMapData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [nextFigures, nextCaptures] = await Promise.all([
        getFiguresAdmin(),
        getRecentCaptures(40),
      ])
      setFigures(nextFigures)
      setCaptures(nextCaptures)
    } catch (loadError) {
      setError(loadError?.message ?? 'No pudimos cargar el mapa admin.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMapData()
  }, [loadMapData])

  const recentCaptures = useMemo(() => captures.slice(0, 30), [captures])

  return (
    <>
      <div className="flex items-end justify-between">
        <p className="text-sm text-muted">
          Verde: figuritas. Azul: capturas recientes ({recentCaptures.length} visibles).
        </p>
        <div className="flex items-center gap-3">
          {loading && <p className="text-sm font-medium text-muted">Cargando datos…</p>}
          <button
            type="button"
            onClick={() => loadMapData()}
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold"
          >
            Actualizar
          </button>
        </div>
      </div>

      <AdminErrorBanner message={error} />

      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
        <AdminMap figures={figures} captures={recentCaptures} className="h-[760px]" />
      </section>
    </>
  )
}
