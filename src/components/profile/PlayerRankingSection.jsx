import { Button } from '../Button'
import { usePlayerRanking } from '../../hooks/usePlayerRanking'

const GRID_COLUMNS = 'grid-cols-[2.75rem_minmax(0,1fr)_4.5rem]'

function formatRankLabel(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return String(rank)
}

function getRowStyles({ rank, isCurrentUser }) {
  const classes = ['border-b border-border/70 last:border-b-0']

  if (isCurrentUser) {
    classes.push('bg-progress/10 ring-1 ring-inset ring-progress/25')
  } else if (rank === 1) {
    classes.push('bg-amber-50/90')
  } else if (rank === 2) {
    classes.push('bg-slate-50/90')
  } else if (rank === 3) {
    classes.push('bg-orange-50/70')
  } else if (rank % 2 === 0) {
    classes.push('bg-warm-white/60')
  } else {
    classes.push('bg-surface/40')
  }

  return classes.join(' ')
}

function RankingTableHeader() {
  return (
    <div
      className={`grid ${GRID_COLUMNS} items-center gap-2 border-b border-border bg-surface/80 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted`}
      aria-hidden="true"
    >
      <span className="text-left">Posición</span>
      <span className="text-left">Jugador</span>
      <span className="text-right">Puntos</span>
    </div>
  )
}

function RankingRow({ entry, isCurrentUser }) {
  const { rank, username, totalPoints } = entry
  const rankLabel = formatRankLabel(rank)
  const isMedal = rank <= 3

  return (
    <li
      className={`grid ${GRID_COLUMNS} items-center gap-2 px-3 py-2.5 ${getRowStyles({ rank, isCurrentUser })}`}
    >
      <span
        className={`text-left tabular-nums ${
          isMedal ? 'text-base leading-none' : 'text-sm font-semibold text-muted'
        }`}
        aria-label={`Posición ${rank}`}
      >
        {isMedal ? (
          <span aria-hidden="true">{rankLabel}</span>
        ) : (
          rankLabel
        )}
      </span>

      <span
        className={`min-w-0 truncate text-left text-sm ${
          isCurrentUser ? 'font-semibold text-progress' : 'font-medium text-ink'
        }`}
        title={username}
      >
        {username}
      </span>

      <span
        className={`text-right text-sm tabular-nums ${
          isCurrentUser ? 'font-semibold text-progress' : 'font-medium text-ink'
        }`}
      >
        {totalPoints} pts
      </span>
    </li>
  )
}

export function PlayerRankingSection() {
  const { leaderboard, me, loading, error, reload } = usePlayerRanking(20)

  const hasPoints = me.totalPoints > 0 && me.rank != null
  const isEmpty = !loading && !error && leaderboard.length === 0

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
      <p className="text-xs uppercase tracking-wide text-muted">Ranking de jugadores</p>

      {loading ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-warm-white/50">
          <RankingTableHeader />
          <div className="space-y-0 px-3 py-4">
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className={`grid ${GRID_COLUMNS} items-center gap-2 border-b border-border/50 py-2.5 last:border-b-0`}
              >
                <div className="h-4 w-6 animate-pulse rounded bg-border/60" />
                <div className="h-4 animate-pulse rounded bg-border/60" />
                <div className="ml-auto h-4 w-10 animate-pulse rounded bg-border/60" />
              </div>
            ))}
          </div>
          <p className="border-t border-border px-3 py-2 text-xs text-muted">Cargando ranking…</p>
        </div>
      ) : error ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
          <Button variant="outline" onClick={() => void reload()}>
            Reintentar
          </Button>
        </div>
      ) : isEmpty ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Todavía no hay jugadores en el ranking. Capturá figuritas para sumar puntos.
        </p>
      ) : (
        <>
          <div className="mt-3 overflow-hidden rounded-xl border border-border bg-warm-white/50">
            <RankingTableHeader />
            <ol className="m-0 list-none p-0" aria-label="Top jugadores">
              {leaderboard.map((entry) => (
                <RankingRow
                  key={`${entry.rank}-${entry.username}`}
                  entry={entry}
                  isCurrentUser={Boolean(me.username && entry.username === me.username)}
                />
              ))}
            </ol>
          </div>

          <div className="mt-4 rounded-xl border border-border/80 bg-warm-white/40 px-3 py-3">
            {hasPoints ? (
              <p className="text-sm font-medium text-ink">
                Tu posición:{' '}
                <span className="font-semibold text-progress">
                  #{me.rank} — {me.totalPoints} pts
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted">Todavía no sumaste puntos</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
