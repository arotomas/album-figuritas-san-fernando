import { formatBuildLabel } from '../../build/appBuildInfo'

export function BuildShaBadge() {
  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[2147483647] max-w-[min(100vw,20rem)] border-b border-r border-white/25 bg-black px-2 py-1 font-mono text-[11px] font-bold leading-tight text-white shadow-lg"
      role="status"
      aria-live="polite"
    >
      {formatBuildLabel()}
    </div>
  )
}
