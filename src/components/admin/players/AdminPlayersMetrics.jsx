import { memo } from 'react'

const MetricCard = memo(function MetricCard({ label, value }) {
  return (
    <div className="min-w-[7.5rem] flex-1 rounded-xl border border-border/80 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-ink">{value}</p>
    </div>
  )
})

export const AdminPlayersMetrics = memo(function AdminPlayersMetrics({ metrics }) {
  return (
    <div className="flex flex-wrap gap-3">
      <MetricCard label="Total" value={metrics.total} />
      <MetricCard label="Activos" value={metrics.active} />
      <MetricCard label="Bloqueados" value={metrics.blocked} />
      <MetricCard label="Admins" value={metrics.admins} />
      <MetricCard label="Con figuritas" value={metrics.withFigures} />
    </div>
  )
})
