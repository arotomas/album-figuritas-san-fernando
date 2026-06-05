import { memo } from 'react'
import { usePlayerPoints } from '../../hooks/usePlayerPoints'

function PlayerPointsBadgeInner({ className = '', layout = 'bar' }) {
  const { totalPoints, loading, visible } = usePlayerPoints()

  if (!visible) return null

  const badge = (
    <div
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-progress/25 bg-progress/10 px-3 py-1 text-[11px] font-semibold text-ink shadow-sm sm:text-xs"
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

  if (layout === 'inline') {
    return <div className={className}>{badge}</div>
  }

  return (
    <div
      className={`flex justify-end border-t border-border/40 bg-warm-white px-4 py-1.5 ${className}`}
    >
      {badge}
    </div>
  )
}

export const PlayerPointsBadge = memo(PlayerPointsBadgeInner)
