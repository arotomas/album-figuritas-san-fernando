import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { useAuth } from '../hooks/useAuth'
import { useAppStore, selectProgress, TOTAL_FIGURES, ALBUM_STATUS } from '../store/useAppStore'
import { isWpConfigured } from '../services/api'
import { getCurrentPosition } from '../services/geoService'
import { GPS_REFINE_OPTIONS } from '../config/gps'
import { isDevMode } from '../utils/devMode'

const STATUS_LABELS = {
  [ALBUM_STATUS.EN_PROGRESO]: 'En progreso',
  [ALBUM_STATUS.COMPLETADO]: 'Álbum completado',
  [ALBUM_STATUS.EN_REVISION]: 'En revisión',
}

export function OptionsScreen() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const resetProgress = useAppStore((state) => state.resetProgress)
  const setDevTestFigureNear = useAppStore((state) => state.setDevTestFigureNear)
  const clearDevTestFigure = useAppStore((state) => state.clearDevTestFigure)
  const devTestFigure = useAppStore((state) => state.devTestFigure)
  const albumStatus = useAppStore((state) => state.albumStatus)
  const lastSavedAt = useAppStore((state) => state.lastSavedAt)
  const progress = useAppStore(selectProgress)
  const [devMessage, setDevMessage] = useState(null)
  const [devLoading, setDevLoading] = useState(false)

  const handleCreateDevFigure = async () => {
    setDevMessage(null)
    setDevLoading(true)

    try {
      const geo = await getCurrentPosition(GPS_REFINE_OPTIONS)
      const ok = setDevTestFigureNear(
        geo.coords.latitude,
        geo.coords.longitude,
      )

      if (!ok) {
        setDevMessage('No hay figuritas pendientes para probar.')
        return
      }

      setDevMessage('Figurita de prueba creada cerca tuyo. Andá al mapa.')
      navigate('/map')
    } catch {
      setDevMessage('No pudimos obtener tu ubicación. Revisá permisos GPS.')
    } finally {
      setDevLoading(false)
    }
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

      {isDevMode() && (
        <div className="mt-6 space-y-3 rounded-2xl border border-amber-400/30 bg-amber-50 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
            Modo prueba (dev)
          </p>
          <p className="text-sm text-amber-900/80">
            Crea una figurita temporal a ~25m de tu ubicación para probar GPS,
            proximidad, cámara y álbum.
          </p>
          {devTestFigure && (
            <p className="text-xs text-amber-800">
              Activa: {devTestFigure.nombre}
            </p>
          )}
          {devMessage && (
            <p className="text-xs text-amber-900">{devMessage}</p>
          )}
          <Button
            variant="outline"
            disabled={devLoading}
            onClick={handleCreateDevFigure}
          >
            {devLoading ? 'Obteniendo ubicación…' : 'Crear figurita de prueba cerca mío'}
          </Button>
          {devTestFigure && (
            <Button variant="ghost" onClick={() => clearDevTestFigure()}>
              Quitar figurita de prueba
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
