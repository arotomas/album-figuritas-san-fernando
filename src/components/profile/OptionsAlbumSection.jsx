import { useAppStore, ALBUM_STATUS } from '../../store/useAppStore'
import { getMainProgressState } from '../../utils/figureGameRules'
import { OptionsSectionCard } from './OptionsSectionCard'

const STATUS_LABELS = {
  [ALBUM_STATUS.EN_PROGRESO]: 'En progreso',
  [ALBUM_STATUS.COMPLETADO]: 'Álbum completado',
  [ALBUM_STATUS.EN_REVISION]: 'En revisión',
}

export function OptionsAlbumSection() {
  const albumStatus = useAppStore((state) => state.albumStatus)
  const lastSavedAt = useAppStore((state) => state.lastSavedAt)
  const figures = useAppStore((state) => state.figures)
  const mainProgress = getMainProgressState(figures)
  const ratio =
    mainProgress.visibleTotal > 0 ? mainProgress.obtained / mainProgress.visibleTotal : 0

  return (
    <OptionsSectionCard title="Mi álbum">
      <p className="mt-4 text-base font-semibold text-ink">{STATUS_LABELS[albumStatus]}</p>
      <p className="mt-1 text-sm text-muted">
        {mainProgress.obtained} de {mainProgress.visibleTotal} figuritas descubiertas
      </p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-border/55">
        <div
          className="h-full rounded-full bg-progress transition-[width] duration-500"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      {lastSavedAt ? (
        <p className="mt-3 text-xs text-muted">
          Último guardado: {new Date(lastSavedAt).toLocaleString('es-AR')}
        </p>
      ) : null}
    </OptionsSectionCard>
  )
}
