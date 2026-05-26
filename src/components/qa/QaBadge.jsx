import { useQaCore } from '../../qa/useQaCore'

export function QaBadge() {
  const { showQaTools } = useQaCore()

  if (!showQaTools) return null

  return (
    <div
      data-qa-banner="true"
      className="pointer-events-none fixed left-3 z-[600] safe-top"
      style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      <span className="inline-flex items-center rounded-full border border-amber-400/25 bg-zinc-950/80 px-2.5 py-0.5 font-sans text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-200/75 shadow-sm backdrop-blur-sm">
        QA
      </span>
    </div>
  )
}
