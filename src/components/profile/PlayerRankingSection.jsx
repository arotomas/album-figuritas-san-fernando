import { Button } from '../Button'
import { usePlayerRanking } from '../../hooks/usePlayerRanking'

const GRID_COLUMNS = 'grid-cols-[4.5rem_minmax(0,1fr)_4.25rem]'

function formatRankLabel(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return String(rank)
}

function getRankingMotivation(me, leaderboard) {
  if (!me.rank || me.totalPoints <= 0 || leaderboard.length === 0) return null

  if (me.rank === 1) {
    return '¡Sos el líder del ranking!'
  }

  if (me.rank <= 3) {
    const target = leaderboard.find((entry) => entry.rank === me.rank - 1)
    if (!target) return '¡Estás en el podio! Seguí sumando para mantenerte arriba.'
    const gap = Math.max(0, target.totalPoints - me.totalPoints)
    if (gap === 0) return `Empatás con el puesto #${target.rank}. ¡Un punto más y subís!`
    return `A solo ${gap} puntos del puesto #${target.rank}`
  }

  const podiumCutoff = leaderboard.find((entry) => entry.rank === 3)
  if (podiumCutoff) {
    const gap = Math.max(0, podiumCutoff.totalPoints - me.totalPoints)
    if (gap === 0) {
      return 'Empatás con el podio. ¡Un punto más y entrás al top 3!'
    }
    return `Te faltan ${gap} puntos para entrar al podio`
  }

  const nextAbove = leaderboard.find((entry) => entry.rank === me.rank - 1)
  if (nextAbove) {
    const gap = Math.max(0, nextAbove.totalPoints - me.totalPoints)
    return `A solo ${gap} puntos del puesto #${nextAbove.rank}`
  }

  return null
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
      className={`grid ${GRID_COLUMNS} items-center gap-x-3 border-b border-border bg-surface/80 px-3 py-2 text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted sm:text-[11px]`}
      aria-hidden="true"
    >
      <span className="text-left">Posición</span>
      <span className="min-w-0 text-left">Jugador</span>
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
      className={`grid ${GRID_COLUMNS} items-center gap-x-3 px-3 py-2 ${getRowStyles({ rank, isCurrentUser })}`}
    >
      <span
        className={`text-left tabular-nums ${
          isMedal ? 'text-base leading-none' : 'text-sm font-semibold text-muted'
        }`}
        aria-label={`Posición ${rank}`}
      >
        {isMedal ? <span aria-hidden="true">{rankLabel}</span> : rankLabel}
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

const PODIUM_STYLES = {
  1: {
    medal: '🥇',
    ring: 'ring-amber-300/80',
    bg: 'bg-white/95',
    scale: 'scale-105 z-10',
    label: '1°',
  },
  2: {
    medal: '🥈',
    ring: 'ring-white/40',
    bg: 'bg-white/85',
    scale: 'scale-100',
    label: '2°',
  },
  3: {
    medal: '🥉',
    ring: 'ring-white/40',
    bg: 'bg-white/85',
    scale: 'scale-100',
    label: '3°',
  },
}

function TopThreePodium({ topThree, currentUsername }) {
  if (topThree.length === 0) return null

  const ordered = [2, 1, 3]
    .map((rank) => topThree.find((entry) => entry.rank === rank))
    .filter(Boolean)

  return (
    <div className="mt-4 grid grid-cols-3 items-end gap-1.5 sm:gap-2">
      {ordered.map((entry) => {
        const style = PODIUM_STYLES[entry.rank]
        const isMe = Boolean(currentUsername && entry.username === currentUsername)

        return (
          <article
            key={entry.rank}
            className={`flex flex-col items-center rounded-xl px-1.5 py-2 text-center shadow-lg ring-2 ${style.ring} ${style.bg} ${style.scale} ${
              entry.rank === 1 ? 'pb-2.5 pt-3' : 'pb-2 pt-2.5'
            }`}
          >
            <span className="text-xl leading-none sm:text-2xl" aria-hidden="true">
              {style.medal}
            </span>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted">
              {style.label}
            </p>
            <p
              className={`mt-0.5 w-full truncate text-[11px] font-bold sm:text-xs ${
                isMe ? 'text-progress' : 'text-ink'
              }`}
              title={entry.username}
            >
              {entry.username}
            </p>
            <p className="mt-0.5 text-base font-black tabular-nums text-ink sm:text-lg">
              {entry.totalPoints}
            </p>
            <p className="text-[9px] font-medium uppercase tracking-wide text-muted">pts</p>
          </article>
        )
      })}
    </div>
  )
}

export function PlayerRankingSection() {
  const { leaderboard, me, loading, error, reload } = usePlayerRanking(20)

  const hasPoints = me.totalPoints > 0 && me.rank != null
  const isEmpty = !loading && !error && leaderboard.length === 0
  const topThree = leaderboard.filter((entry) => entry.rank <= 3)
  const restOfLeaderboard = leaderboard.filter((entry) => entry.rank > 3)
  const motivationMessage = getRankingMotivation(me, leaderboard)

  return (
    <section
      className="relative shrink-0 overflow-hidden bg-gradient-to-b from-[#6ba832] via-progress to-[#5a9428] px-5 pb-5 pt-5 text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)] sm:px-6 sm:pb-6 sm:pt-6"
      aria-labelledby="ranking-hero-title"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-black/10 blur-2xl"
        aria-hidden="true"
      />

      <div className="relative">
        <h1
          id="ranking-hero-title"
          className="flex items-center gap-2.5 font-display text-3xl font-black leading-tight tracking-tight sm:text-4xl"
        >
          <span className="text-4xl leading-none drop-shadow-sm sm:text-5xl" aria-hidden="true">
            🏆
          </span>
          <span>Ranking de Jugadores</span>
        </h1>

        {loading ? (
          <div className="mt-5 space-y-3">
            <div className="h-20 animate-pulse rounded-2xl bg-white/20" />
            <div className="grid grid-cols-3 gap-1.5">
              {[0, 1, 2].map((slot) => (
                <div key={slot} className="h-24 animate-pulse rounded-xl bg-white/15" />
              ))}
            </div>
            <p className="text-center text-sm text-white/80">Cargando ranking…</p>
          </div>
        ) : error ? (
          <div className="mt-5 space-y-3 rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
            <p className="text-sm font-medium text-white" role="alert">
              {error}
            </p>
            <Button
              variant="outline"
              className="border-white/40 bg-white/10 text-white hover:bg-white/20"
              onClick={() => void reload()}
            >
              Reintentar
            </Button>
          </div>
        ) : isEmpty ? (
          <p className="mt-5 text-sm leading-relaxed text-white/90">
            Todavía no hay jugadores en el ranking. Capturá figuritas para sumar puntos.
          </p>
        ) : (
          <>
            <div className="mt-4 rounded-2xl border border-white/25 bg-white/15 p-3 backdrop-blur-sm">
              {hasPoints ? (
                <>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
                        Tu posición
                      </p>
                      <p className="mt-0.5 font-display text-5xl font-black tabular-nums leading-none sm:text-6xl">
                        #{me.rank}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
                        Tus puntos
                      </p>
                      <p className="mt-0.5 font-display text-4xl font-black tabular-nums leading-none sm:text-5xl">
                        {me.totalPoints}
                      </p>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                        pts
                      </p>
                    </div>
                  </div>
                  {motivationMessage ? (
                    <p className="mt-2 text-sm font-medium leading-snug text-white/90">
                      {motivationMessage}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-base font-medium text-white/90">
                  Todavía no sumaste puntos. ¡Salí a capturar figuritas!
                </p>
              )}
            </div>

            <TopThreePodium topThree={topThree} currentUsername={me.username} />

            {restOfLeaderboard.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/20 bg-white shadow-lg">
                <RankingTableHeader />
                <ol className="m-0 list-none p-0" aria-label="Resto del ranking">
                  {restOfLeaderboard.map((entry) => (
                    <RankingRow
                      key={`${entry.rank}-${entry.username}`}
                      entry={entry}
                      isCurrentUser={Boolean(me.username && entry.username === me.username)}
                    />
                  ))}
                </ol>
              </div>
            ) : topThree.length > 0 && leaderboard.length <= 3 ? (
              <p className="mt-4 text-center text-sm text-white/80">
                ¡Sos parte del podio! Seguí sumando para mantenerte arriba.
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}
