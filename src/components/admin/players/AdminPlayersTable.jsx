import { memo, useCallback, useMemo } from 'react'
import { FaChevronRight } from 'react-icons/fa6'
import { ReviewBadge } from '../adminShared'
import { formatRoleLabel, PROFILE_ROLES } from '../../../utils/roles'
import { getFullName } from '../../../utils/profileValidation'
import {
  formatRelativeTime,
  getEmptyStateForContext,
  getOperationalToneLabel,
  getPlayerInitials,
  getPlayerOperationalTone,
  hasActivePlayerFilters,
  OPERATIONAL_TONE_STYLES,
  QUICK_TABS,
} from './playerAdminUtils'
import { AdminPlayersPagination } from './AdminPlayersPagination'
import {
  AdminPlayersEmptyState,
  CardListSkeleton,
  TableRowSkeleton,
} from './AdminPlayersUi'

const RoleBadge = memo(function RoleBadge({ role }) {
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator'
  const styles = {
    user: 'bg-slate-100 text-slate-700 ring-slate-200',
    moderator: 'bg-sky-100 text-sky-800 ring-sky-200',
    admin: 'bg-amber-100 text-amber-900 ring-amber-200',
    super_admin: 'bg-violet-100 text-violet-900 ring-violet-200',
  }

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
        isAdmin ? styles[role] ?? styles.super_admin : styles.user
      }`}
    >
      {formatRoleLabel(role)}
    </span>
  )
})

const PlayerAvatar = memo(function PlayerAvatar({ player }) {
  if (player.avatar_url) {
    return (
      <img
        src={player.avatar_url}
        alt=""
        className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
      />
    )
  }

  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white ring-2 ring-white">
      {getPlayerInitials(player)}
    </span>
  )
})

const ProgressCell = memo(function ProgressCell({ player }) {
  const obtained = player.mainProgress?.obtained ?? 0
  const total = player.mainProgress?.total ?? 0
  const pct = total > 0 ? Math.round((obtained / total) * 100) : 0

  return (
    <div className="min-w-[7rem]">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-mono font-semibold text-ink">
          {obtained}/{total}
        </span>
        <span className="text-muted">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-progress transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
})

const PlayerTableRow = memo(function PlayerTableRow({ player, selected, onSelect }) {
  const tone = getPlayerOperationalTone(player)
  const toneStyles = OPERATIONAL_TONE_STYLES[tone]
  const toneLabel = getOperationalToneLabel(tone)

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(player)
    }
  }

  return (
    <tr
      tabIndex={0}
      role="row"
      aria-selected={selected}
      onClick={() => onSelect(player)}
      onKeyDown={handleKeyDown}
      className={`cursor-pointer border-t border-border/60 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400 ${toneStyles.row} ${
        selected ? toneStyles.selected : ''
      }`}
    >
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-3">
          <PlayerAvatar player={player} />
          <div>
            <p className="font-semibold text-ink">{player.username ?? 'Sin usuario'}</p>
            <p className="text-xs text-muted">{player.email ?? '-'}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5 text-sm text-ink">{getFullName(player) || '-'}</td>
      <td className="px-4 py-2.5 text-sm text-muted">{player.localidad ?? '-'}</td>
      <td className="px-4 py-2.5">
        <ProgressCell player={player} />
      </td>
      <td className="px-4 py-2.5">
        <p className="text-xs font-semibold text-ink">{formatRelativeTime(player.lastActivity)}</p>
        {toneLabel && (
          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${toneStyles.pill}`}>
            {toneLabel}
          </span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <ReviewBadge status={player.album_status ?? 'pending'} />
      </td>
      <td className="px-4 py-2.5">
        <RoleBadge role={player.role ?? 'user'} />
      </td>
      <td className="px-4 py-2.5 text-right">
        <button
          type="button"
          aria-label={`Ver detalle de ${player.username ?? 'jugador'}`}
          onClick={(event) => {
            event.stopPropagation()
            onSelect(player)
          }}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-ink ring-1 ring-border transition-colors hover:bg-slate-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Ver
          <FaChevronRight className="text-[10px]" aria-hidden="true" />
        </button>
      </td>
    </tr>
  )
})

const PlayerCard = memo(function PlayerCard({ player, selected, onSelect }) {
  const tone = getPlayerOperationalTone(player)
  const toneStyles = OPERATIONAL_TONE_STYLES[tone]

  return (
    <button
      type="button"
      onClick={() => onSelect(player)}
      className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${toneStyles.row} ${
        selected ? `${toneStyles.selected} ring-1 ring-slate-900/10` : 'border-border'
      }`}
    >
      <div className="flex items-start gap-3">
        <PlayerAvatar player={player} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-ink">{player.username ?? 'Sin usuario'}</p>
              <p className="text-xs text-muted">{getFullName(player) || player.email || '-'}</p>
            </div>
            <FaChevronRight className="mt-1 shrink-0 text-muted" aria-hidden="true" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <RoleBadge role={player.role ?? 'user'} />
            <ReviewBadge status={player.album_status ?? 'pending'} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
            <span>{player.localidad ?? 'Sin localidad'}</span>
            <span>{formatRelativeTime(player.lastActivity)}</span>
            <span>
              Álbum: {player.mainProgress?.obtained ?? 0}/{player.mainProgress?.total ?? 0}
            </span>
            <span>Capturas: {player.totalCaptures ?? 0}</span>
          </div>
        </div>
      </div>
    </button>
  )
})

const PlayersToolbar = memo(function PlayersToolbar({
  quickTab,
  onQuickTabChange,
  filters,
  onFilterChange,
}) {
  return (
    <div className="sticky top-0 z-20 space-y-4 border-b border-border bg-white/85 p-4 shadow-sm backdrop-blur-md">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtros rápidos">
        {QUICK_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={quickTab === tab.id}
            onClick={() => onQuickTabChange(tab.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
              quickTab === tab.id
                ? tab.id === 'blocked'
                  ? 'bg-red-600 text-white'
                  : tab.id === 'suspicious'
                    ? 'bg-orange-600 text-white'
                    : tab.id === 'admins'
                      ? 'bg-violet-600 text-white'
                      : tab.id === 'new'
                        ? 'bg-blue-600 text-white'
                        : tab.id === 'active'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 text-white'
                : 'bg-white text-muted ring-1 ring-border hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[12rem] flex-1 text-xs font-bold uppercase tracking-wide text-muted">
          Buscar
          <input
            value={filters.query}
            onChange={(event) => onFilterChange('query', event.target.value)}
            placeholder="Nombre, email, DNI, localidad..."
            aria-label="Buscar jugadores"
            className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          />
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-muted">
          Username
          <input
            value={filters.username}
            onChange={(event) => onFilterChange('username', event.target.value)}
            placeholder="Apodo"
            aria-label="Filtrar por username"
            className="mt-1 block w-36 rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          />
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-muted">
          Localidad
          <input
            value={filters.localidad}
            onChange={(event) => onFilterChange('localidad', event.target.value)}
            placeholder="San Fernando"
            aria-label="Filtrar por localidad"
            className="mt-1 block w-36 rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          />
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-muted">
          DNI
          <input
            value={filters.dni}
            onChange={(event) => onFilterChange('dni', event.target.value)}
            placeholder="12345678"
            aria-label="Filtrar por DNI"
            className="mt-1 block w-32 rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          />
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-muted">
          Email
          <input
            value={filters.email}
            onChange={(event) => onFilterChange('email', event.target.value)}
            placeholder="email@..."
            aria-label="Filtrar por email"
            className="mt-1 block w-40 rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          />
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-muted">
          Estado
          <select
            value={filters.albumStatus}
            onChange={(event) => onFilterChange('albumStatus', event.target.value)}
            aria-label="Filtrar por estado de álbum"
            className="mt-1 block w-36 rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="approved">Aprobado</option>
            <option value="rejected">Rechazado</option>
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-muted">
          Rol
          <select
            value={filters.role}
            onChange={(event) => onFilterChange('role', event.target.value)}
            aria-label="Filtrar por rol"
            className="mt-1 block w-36 rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <option value="all">Todos</option>
            {PROFILE_ROLES.map((role) => (
              <option key={role} value={role}>
                {formatRoleLabel(role)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-muted">
          Progreso
          <select
            value={filters.progress}
            onChange={(event) => onFilterChange('progress', event.target.value)}
            aria-label="Filtrar por progreso"
            className="mt-1 block w-36 rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <option value="all">Todos</option>
            <option value="complete">Completo</option>
            <option value="incomplete">Incompleto</option>
          </select>
        </label>
      </div>
    </div>
  )
})

export const AdminPlayersTable = memo(function AdminPlayersTable({
  players,
  loading,
  selectedPlayerId,
  quickTab,
  onQuickTabChange,
  filters,
  onFilterChange,
  onSelectPlayer,
  onClearFilters,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}) {
  const emptyState = useMemo(
    () => getEmptyStateForContext({ quickTab, filters }),
    [quickTab, filters],
  )
  const showClearFilters = hasActivePlayerFilters(filters) || quickTab !== 'all'
  const skeletonRows = Math.min(pageSize, 8)

  const handleSelect = useCallback(
    (player) => {
      onSelectPlayer(player)
    },
    [onSelectPlayer],
  )

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
      aria-busy={loading}
      aria-label="Listado de jugadores"
    >
      <PlayersToolbar
        quickTab={quickTab}
        onQuickTabChange={onQuickTabChange}
        filters={filters}
        onFilterChange={onFilterChange}
      />

      <div className="hidden lg:block">
        <div className="max-h-[calc(100vh-24rem)] min-h-[20rem] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-white text-[11px] uppercase tracking-wide text-muted shadow-[0_1px_0_rgba(15,23,42,0.06)]">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Jugador
                </th>
                <th scope="col" className="px-4 py-3">
                  Nombre
                </th>
                <th scope="col" className="px-4 py-3">
                  Localidad
                </th>
                <th scope="col" className="px-4 py-3">
                  Progreso
                </th>
                <th scope="col" className="px-4 py-3">
                  Última actividad
                </th>
                <th scope="col" className="px-4 py-3">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3">
                  Rol
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && <TableRowSkeleton rows={skeletonRows} />}
              {!loading &&
                players.map((player) => (
                  <PlayerTableRow
                    key={player.id}
                    player={player}
                    selected={selectedPlayerId === player.id}
                    onSelect={handleSelect}
                  />
                ))}
            </tbody>
          </table>
          {!players.length && !loading && (
            <AdminPlayersEmptyState
              title={emptyState.title}
              description={emptyState.description}
              showClear={showClearFilters}
              onClearFilters={onClearFilters}
            />
          )}
        </div>
      </div>

      <div className="min-h-[12rem] space-y-3 p-4 lg:hidden">
        {loading && <CardListSkeleton count={Math.min(pageSize, 4)} />}
        {!loading &&
          players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              selected={selectedPlayerId === player.id}
              onSelect={handleSelect}
            />
          ))}
        {!players.length && !loading && (
          <AdminPlayersEmptyState
            title={emptyState.title}
            description={emptyState.description}
            showClear={showClearFilters}
            onClearFilters={onClearFilters}
          />
        )}
      </div>

      <AdminPlayersPagination
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </section>
  )
})
