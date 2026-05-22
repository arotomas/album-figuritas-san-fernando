import { FaWifi } from 'react-icons/fa6'

export function OfflineBanner({ isOffline }) {
  if (!isOffline) return null

  return (
    <div className="safe-top pointer-events-none fixed inset-x-0 top-0 z-[90] flex animate-slide-up justify-center px-4 pt-2">
      <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-zinc-900 px-4 py-2 shadow-md">
        <FaWifi className="rotate-45 text-amber-400" size={14} />
        <span className="text-xs font-medium text-amber-200">
          Modo offline — podés ver tu álbum
        </span>
      </div>
    </div>
  )
}
