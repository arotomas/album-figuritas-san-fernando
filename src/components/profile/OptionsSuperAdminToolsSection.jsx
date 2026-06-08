import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../Button'
import { getCurrentPosition } from '../../services/geoService'
import { GPS_HIGH_ACCURACY_OPTIONS } from '../../config/gps'
import { useAppStore } from '../../store/useAppStore'
import { OptionsSectionCard } from './OptionsSectionCard'

export function OptionsSuperAdminToolsSection() {
  const navigate = useNavigate()
  const setQaTestFigureNear = useAppStore((state) => state.setQaTestFigureNear)
  const clearQaTestFigure = useAppStore((state) => state.clearQaTestFigure)
  const qaTestFigure = useAppStore((state) => state.qaTestFigure)
  const [qaMessage, setQaMessage] = useState(null)
  const [qaLoading, setQaLoading] = useState(false)

  const handleCreateQaFigure = async () => {
    setQaMessage(null)
    setQaLoading(true)

    try {
      const geo = await getCurrentPosition(GPS_HIGH_ACCURACY_OPTIONS)
      const ok = setQaTestFigureNear(geo.coords.latitude, geo.coords.longitude)

      if (!ok) {
        setQaMessage('No hay figuritas pendientes para probar.')
        return
      }

      setQaMessage('Figurita QA creada a ~5–10 m. Andá al mapa.')
      navigate('/map')
    } catch {
      setQaMessage('No pudimos obtener tu ubicación. Revisá permisos GPS.')
    } finally {
      setQaLoading(false)
    }
  }

  const handleClearQaFigure = () => {
    clearQaTestFigure()
    setQaMessage('Figurita QA eliminada.')
  }

  return (
    <OptionsSectionCard
      title="Herramientas super admin"
      description="Solo visible para super administradores."
      className="border-cyan-300/60 bg-cyan-50/40"
    >
      <p className="mt-4 rounded-lg border border-cyan-500/40 bg-cyan-100 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-cyan-900">
        QA ENABLED
      </p>
      <p className="mt-4 text-sm leading-relaxed text-cyan-950/85">
        Creá una figurita temporal a 5–10 m de tu ubicación. Flujo real: proximidad → cámara → foto
        → desbloqueo. Solo memoria — no backend.
      </p>
      {qaTestFigure ? (
        <p className="mt-3 text-xs font-medium text-cyan-900">Activa: {qaTestFigure.nombre}</p>
      ) : null}
      {qaMessage ? <p className="mt-2 text-xs text-cyan-950">{qaMessage}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" disabled={qaLoading} onClick={() => void handleCreateQaFigure()}>
          {qaLoading ? 'Obteniendo ubicación…' : 'Crear figurita de prueba cerca mío'}
        </Button>
        {qaTestFigure ? (
          <Button variant="ghost" onClick={handleClearQaFigure}>
            Eliminar figurita QA
          </Button>
        ) : null}
      </div>
    </OptionsSectionCard>
  )
}
