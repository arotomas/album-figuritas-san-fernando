import { useQaCore } from '../../qa/useQaCore'

export function QaBadge({ className = '' }) {
  const { showQaTools } = useQaCore()

  if (!showQaTools) return null

  return (
    <div
      data-qa-banner="true"
      className={`safe-top safe-x shrink-0 border-b border-amber-500/40 bg-amber-100 px-4 py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-amber-900 ${className}`}
    >
      QA MODE
    </div>
  )
}
