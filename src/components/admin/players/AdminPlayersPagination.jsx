import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6'
import { PAGE_SIZE_OPTIONS } from './playerAdminUtils'

export function AdminPlayersPagination({
  page,
  pageSize,
  total,
  loading,
  onPageChange,
  onPageSizeChange,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const to = Math.min(safePage * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-white px-4 py-3">
      <p className="text-xs text-muted">
        {total === 0 ? (
          'Sin resultados'
        ) : (
          <>
            Mostrando <span className="font-semibold text-ink">{from}–{to}</span> de{' '}
            <span className="font-semibold text-ink">{total}</span>
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted">
          Por página
          <select
            value={pageSize}
            disabled={loading}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-lg border border-border bg-white px-2 py-1.5 text-sm normal-case tracking-normal text-ink"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={loading || safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-ink ring-1 ring-border transition-colors hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FaChevronLeft className="text-[10px]" />
            Anterior
          </button>
          <span className="px-2 text-xs font-semibold tabular-nums text-muted">
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={loading || safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-ink ring-1 ring-border transition-colors hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
            <FaChevronRight className="text-[10px]" />
          </button>
        </div>
      </div>
    </div>
  )
}
