import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore, selectProgress } from '../store/useAppStore'

function ProgressBarInner({
  className = '',
  showLabel = true,
  showSimulateLink = true,
  variant = 'light',
}) {
  const progress = useAppStore(selectProgress)
  const figures = useAppStore((state) => state.figures)
  const setNearFigure = useAppStore((state) => state.setNearFigure)
  const navigate = useNavigate()

  const isDark = variant === 'dark'
  const totalFigures = figures.length

  return (
    <div className={className}>
      {showLabel && (
        <p
          className={`mb-3 text-center text-sm font-medium ${
            isDark ? 'text-zinc-200' : 'text-ink'
          }`}
        >
          ¡Encontrá la próxima figurita!
        </p>
      )}

      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1">
          {Array.from({ length: totalFigures }).map((_, index) => (
            <div
              key={index}
              className={`h-3 flex-1 rounded-sm transition-colors duration-300 ${
                index < progress
                  ? 'bg-progress'
                  : isDark
                    ? 'bg-zinc-700'
                    : 'bg-border'
              }`}
            />
          ))}
        </div>
        <span
          className={`min-w-10 text-right text-sm font-semibold ${
            isDark ? 'text-white' : 'text-ink'
          }`}
        >
          {progress}/{totalFigures}
        </span>
      </div>

      {showSimulateLink && progress < totalFigures && (
        <button
          type="button"
          onClick={() => {
            const next = figures.find((f) => !f.obtenida)
            if (!next) return
            setNearFigure({ ...next, distanceMeters: 12 })
            navigate('/near')
          }}
          className={`mt-3 w-full text-center text-xs underline-offset-2 hover:underline ${
            isDark ? 'text-zinc-400' : 'text-muted'
          }`}
        >
          Simular proximidad a la próxima figurita
        </button>
      )}
    </div>
  )
}

export const ProgressBar = memo(ProgressBarInner)
