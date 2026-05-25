import { memo } from 'react'
import { m } from 'framer-motion'
import { COLLECTION_STATUS } from '../../config/albumCollections'
import { typeClasses } from '../../theme/typography'

function StatCell({ label, value, sub }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-0.5 truncate font-display text-sm font-black text-warm-white">{value}</p>
      {sub && <p className="mt-0.5 truncate text-[10px] text-white/45">{sub}</p>}
    </div>
  )
}

function AlbumGlobalDashboardInner({ globalProgress }) {
  const {
    percentComplete,
    obtained,
    total,
    completedCollectionCount,
    totalCollectionCount,
    mostAdvanced,
    nextToComplete,
  } = globalProgress

  return (
    <m.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="album-global-dashboard relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-charcoal/92 px-4 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)] backdrop-blur-md"
      aria-label="Progreso global del álbum"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(140,198,63,0.14),transparent_42%),radial-gradient(circle_at_88%_100%,rgba(255,255,255,0.05),transparent_38%)]" />

      <div className="relative flex items-end justify-between gap-4">
        <div>
          <p className={`${typeClasses.micro} text-white/45`}>Tu álbum</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-black tabular-nums tracking-tight text-warm-white">
              {percentComplete}
            </span>
            <span className="text-lg font-bold text-progress">%</span>
          </div>
          <p className="mt-1 text-sm text-white/55">
            {obtained} de {total} figuritas
          </p>
        </div>

        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-progress/25 bg-progress/10">
          <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="#8cc63f"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${Math.max(0, Math.min(100, percentComplete))} 100`}
              pathLength="100"
            />
          </svg>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-3 border-t border-white/8 pt-3 sm:grid-cols-3">
        <StatCell
          label="Colecciones"
          value={`${completedCollectionCount}/${totalCollectionCount}`}
          sub="completadas"
        />
        <StatCell
          label="Más avanzada"
          value={
            mostAdvanced
              ? `${mostAdvanced.collection.icon} ${mostAdvanced.collection.label}`
              : '—'
          }
          sub={
            mostAdvanced
              ? `${mostAdvanced.obtained}/${mostAdvanced.total} · ${mostAdvanced.percent}%`
              : 'Empezá a explorar'
          }
        />
        <StatCell
          label="Próxima meta"
          value={
            nextToComplete
              ? `${nextToComplete.collection.icon} ${nextToComplete.collection.label}`
              : completedCollectionCount === totalCollectionCount
                ? '¡Álbum listo!'
                : '—'
          }
          sub={
            nextToComplete
              ? nextToComplete.status === COLLECTION_STATUS.ALMOST_COMPLETE
                ? `Faltan ${nextToComplete.total - nextToComplete.obtained}`
                : `${nextToComplete.percent}% completada`
              : null
          }
        />
      </div>
    </m.section>
  )
}

export const AlbumGlobalDashboard = memo(AlbumGlobalDashboardInner)
