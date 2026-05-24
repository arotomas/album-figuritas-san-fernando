import { useEffect } from 'react'
import { FaMagnifyingGlass, FaRotateRight, FaUsersSlash, FaXmark } from 'react-icons/fa6'

export function AdminConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  busy = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}) {
  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onCancel?.()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, busy, onCancel])

  if (!open) return null

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50'
      : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50'

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel?.()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        className="w-full max-w-lg rounded-2xl border border-border bg-white p-6 shadow-2xl"
      >
        <h3 id="admin-confirm-title" className="text-xl font-black text-ink">
          {title}
        </h3>
        {description && <p className="mt-3 text-sm leading-6 text-muted">{description}</p>}
        {children}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
            className={`rounded-xl px-4 py-2 text-sm font-bold disabled:cursor-not-allowed ${confirmClass}`}
          >
            {busy ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminPlayersEmptyState({ title, description, onClearFilters, showClear }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        {showClear ? <FaMagnifyingGlass className="text-xl" /> : <FaUsersSlash className="text-xl" />}
      </div>
      <h3 className="mt-4 text-lg font-black text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
      {showClear && (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}

export function AdminInlineError({ message, onRetry, retryLabel = 'Reintentar' }) {
  if (!message) return null

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <p className="font-medium">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-red-800 ring-1 ring-red-200 transition-colors hover:bg-red-100"
        >
          <FaRotateRight />
          {retryLabel}
        </button>
      )}
    </div>
  )
}

export function AdminToast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return undefined
    const timer = setTimeout(() => onDismiss?.(), 5000)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[80] flex max-w-sm items-start gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-xl"
    >
      <p className="flex-1 text-sm font-medium text-ink">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar notificación"
        className="rounded-lg p-1 text-muted hover:bg-slate-100 hover:text-ink"
      >
        <FaXmark />
      </button>
    </div>
  )
}

export function TableRowSkeleton({ rows = 8 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr key={index} className="border-t border-border/40" aria-hidden="true">
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
              <div className="min-w-[8rem] flex-1 space-y-2">
                <div className="h-3.5 w-28 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-36 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          </td>
          <td className="px-4 py-3">
            <div className="h-3.5 w-24 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-3">
            <div className="h-3.5 w-20 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-3">
            <div className="h-2 w-24 animate-pulse rounded-full bg-slate-100" />
          </td>
          <td className="px-4 py-3">
            <div className="h-3.5 w-16 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-3">
            <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
          </td>
          <td className="px-4 py-3">
            <div className="h-5 w-14 animate-pulse rounded-full bg-slate-100" />
          </td>
          <td className="px-4 py-3 text-right">
            <div className="ml-auto h-7 w-14 animate-pulse rounded-lg bg-slate-100" />
          </td>
        </tr>
      ))}
    </>
  )
}

export function CardListSkeleton({ count = 4 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100" aria-hidden="true" />
      ))}
    </>
  )
}
