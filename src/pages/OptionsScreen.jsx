import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { useAuth } from '../hooks/useAuth'
import { useAppStore, selectProgress, TOTAL_FIGURES, ALBUM_STATUS } from '../store/useAppStore'
import { isWpConfigured } from '../services/api'
import { getCurrentPosition } from '../services/geoService'
import { GPS_HIGH_ACCURACY_OPTIONS } from '../config/gps'
import { isDevMode } from '../utils/devMode'
import { useQaMode } from '../utils/qaMode'

const STATUS_LABELS = {
  [ALBUM_STATUS.EN_PROGRESO]: 'En progreso',
  [ALBUM_STATUS.COMPLETADO]: 'Álbum completado',
  [ALBUM_STATUS.EN_REVISION]: 'En revisión',
}

export function OptionsScreen() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { isQaActive, showQaTools, withQa } = useQaMode()
  const resetProgress = useAppStore((state) => state.resetProgress)
  const setQaTestFigureNear = useAppStore((state) => state.setQaTestFigureNear)
  const clearQaTestFigure = useAppStore((state) => state.clearQaTestFigure)
  const qaTestFigure = useAppStore((state) => state.qaTestFigure)
  const albumStatus = useAppStore((state) => state.albumStatus)
  const lastSavedAt = useAppStore((state) => state.lastSavedAt)
  const progress = useAppStore(selectProgress)
  const [qaMessage, setQaMessage] = useState(null)
  const [qaLoading, setQaLoading] = useState(false)

  const handleCreateQaFigure = async () => {
    setQaMessage(null)
    setQaLoading(true)

    try {
      const geo = await getCurrentPosition(GPS_HIGH_ACCURACY_OPTIONS)
      const ok = setQaTestFigureNear(
        geo.coords.latitude,
        geo.coords.longitude,
      )

      if (!ok) {
        setQaMessage('No hay figuritas pendientes para probar o el modo QA no está activo.')
        return
      }

      setQaMessage('Figurita QA creada a ~5–10m. Andá al mapa.')
      navigate(withQa('/map'))
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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
      <h1 className="text-xl font-bold text-ink">Opciones</h1>
      <p className="mt-1 text-sm text-muted">Configuración de la app</p>

      <div className="mt-8 space-y-4 rounded-2xl border border-border bg-surface p-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Usuario</p>
          <p className="mt-1 font-medium text-ink">
            {user?.displayName || 'Explorador'}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Álbum</p>
          <p className="mt-1 text-sm font-medium text-ink">
            {STATUS_LABELS[albumStatus]}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Progreso: {progress}/{TOTAL_FIGURES}
          </p>
          {lastSavedAt && (
            <p className="mt-0.5 text-xs text-muted">
              Guardado: {new Date(lastSavedAt).toLocaleString('es-AR')}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Almacenamiento</p>
          <p className="mt-1 text-sm text-ink">Local (localStorage)</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Backend</p>
          <p className="mt-1 text-sm text-ink">
            {isWpConfigured()
              ? 'WordPress Headless conectado'
              : 'Modo local — WordPress pendiente'}
          </p>
        </div>
      </div>

      {showQaTools && (
        <div
          className={`mt-6 space-y-3 rounded-2xl border p-5 ${
            isQaActive
              ? 'border-cyan-400/40 bg-cyan-50'
              : 'border-amber-400/30 bg-amber-50'
          }`}
        >
          <p
            className={`text-xs font-bold uppercase tracking-wide ${
              isQaActive ? 'text-cyan-900' : 'text-amber-800'
            }`}
          >
            {isQaActive ? 'Modo QA temporal' : 'Modo prueba (dev)'}
          </p>
          <p className={`text-sm ${isQaActive ? 'text-cyan-950/80' : 'text-amber-900/80'}`}>
            Crea una figurita temporal a 5–10m de tu ubicación. Flujo real:
            proximidad → cámara → foto → desbloqueo. Solo memoria — no backend.
          </p>
          {isQaActive && (
            <p className="text-xs text-cyan-800/90">
              Activado con{' '}
              <code className="rounded bg-cyan-100 px-1">?qa=1</code> en esta sesión.
            </p>
          )}
          {!isQaActive && isDevMode() && (
            <p className="text-xs text-amber-800/90">Disponible en entorno de desarrollo.</p>
          )}
          {qaTestFigure && (
            <p className={`text-xs ${isQaActive ? 'text-cyan-900' : 'text-amber-800'}`}>
              Activa: {qaTestFigure.nombre}
            </p>
          )}
          {qaMessage && (
            <p className={`text-xs ${isQaActive ? 'text-cyan-950' : 'text-amber-900'}`}>
              {qaMessage}
            </p>
          )}
          <Button
            variant="outline"
            disabled={qaLoading}
            onClick={handleCreateQaFigure}
          >
            {qaLoading ? 'Obteniendo ubicación…' : 'Crear figurita de prueba cerca mío'}
          </Button>
          {qaTestFigure && (
            <Button variant="ghost" onClick={handleClearQaFigure}>
              Eliminar figurita QA
            </Button>
          )}
        </div>
      )}

      <div className="mt-auto space-y-3 pb-2 pt-8">
        <Button variant="outline" onClick={resetProgress}>
          Reiniciar progreso
        </Button>
        <Button variant="ghost" onClick={logout}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}
