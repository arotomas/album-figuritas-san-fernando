import { Button } from '../Button'
import { usePlayerRanking } from '../../hooks/usePlayerRanking'

function formatEntryLine({ rank, username, totalPoints }) {
  return `#${rank} ${username} — ${totalPoints} pts`
}

export function PlayerRankingSection() {
  const { leaderboard, me, loading, error, reload } = usePlayerRanking(20)

  const hasPoints = me.totalPoints > 0 && me.rank != null
  const isEmpty = !loading && !error && leaderboard.length === 0

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
      <p className="text-xs uppercase tracking-wide text-muted">Ranking de jugadores</p>

      {loading ? (
        <p className="mt-3 text-sm text-muted">Cargando ranking…</p>
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
          <ol className="mt-3 space-y-2" aria-label="Top jugadores">
            {leaderboard.map((entry) => {
              const isCurrentUser = me.username && entry.username === me.username

              return (
                <li
                  key={`${entry.rank}-${entry.username}`}
                  className={`text-sm ${
                    isCurrentUser ? 'font-semibold text-progress' : 'text-ink'
                  }`}
                >
                  {formatEntryLine(entry)}
                </li>
              )
            })}
          </ol>

          <div className="mt-4 border-t border-border pt-4">
            {hasPoints ? (
              <p className="text-sm font-medium text-ink">
                Tu posición: #{me.rank} — {me.totalPoints} pts
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
