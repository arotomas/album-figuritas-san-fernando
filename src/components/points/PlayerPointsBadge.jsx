import { memo } from 'react'
import { usePlayerPoints } from '../../hooks/usePlayerPoints'

function PlayerPointsBadgeInner({ className = '' }) {
  const { totalPoints, loading, visible } = usePlayerPoints()

  if (!visible) return null

  return (
    <div
      className={`inline-flex max-w-[7.5rem] items-center gap-1 rounded-full border border-progress/25 bg-progress/10 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-sm sm:max-w-none sm:px-3 sm:text-xs ${className}`}
      aria-label={
        loading && totalPoints == null
          ? 'Cargando puntos'
          : `${totalPoints ?? 0} puntos totales`
      }
      title="Tus puntos totales"
    >
      <span aria-hidden className="shrink-0 text-sm leading-none">
        ⭐
      </span>
      {loading && totalPoints == null ? (
        <span className="h-3 w-10 animate-pulse rounded bg-border/70" aria-hidden />
      ) : (
        <span className="truncate tabular-nums">{totalPoints ?? 0} pts</span>
      )}
    </div>
  )
}

export const PlayerPointsBadge = memo(PlayerPointsBadgeInner)
