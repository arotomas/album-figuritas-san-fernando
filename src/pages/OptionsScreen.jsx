import { Button } from '../components/Button'
import { useAuth } from '../hooks/useAuth'
import { useAppStore, selectProgress, TOTAL_FIGURES, ALBUM_STATUS } from '../store/useAppStore'
import { isWpConfigured } from '../services/api'

const STATUS_LABELS = {
  [ALBUM_STATUS.EN_PROGRESO]: 'En progreso',
  [ALBUM_STATUS.COMPLETADO]: 'Álbum completado',
  [ALBUM_STATUS.EN_REVISION]: 'En revisión',
}

export function OptionsScreen() {
  const { user, logout } = useAuth()
  const resetProgress = useAppStore((state) => state.resetProgress)
  const albumStatus = useAppStore((state) => state.albumStatus)
  const lastSavedAt = useAppStore((state) => state.lastSavedAt)
  const progress = useAppStore(selectProgress)

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 py-6">
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

      <div className="mt-auto space-y-3 pb-2">
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
