import {
  GEO_OUTSIDE_PRIMARY_HINT,
  GEO_OUTSIDE_PRIMARY_LABEL,
  shouldShowOutsidePrimaryWarning,
} from '../../geo/geoPolicy'

export function GeoPolicyBanner({ position }) {
  if (!position || !shouldShowOutsidePrimaryWarning(position.lat, position.lng)) {
    return null
  }

  return (
    <div
      className="safe-top pointer-events-none absolute inset-x-4 top-[4.75rem] z-[499] flex justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="max-w-sm rounded-full border border-sky-400/30 bg-zinc-950/90 px-4 py-2 shadow-lg backdrop-blur-md">
        <p className="text-center font-sans text-[11px] font-semibold tracking-wide text-sky-100">
          {GEO_OUTSIDE_PRIMARY_LABEL}
        </p>
        <p className="mt-0.5 text-center font-sans text-[10px] leading-snug text-sky-100/75">
          {GEO_OUTSIDE_PRIMARY_HINT}
        </p>
      </div>
    </div>
  )
}
