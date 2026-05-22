export function HydrationScreen() {
  return (
    <div className="screen-full safe-top safe-bottom safe-x relative flex flex-col items-center justify-center overflow-hidden bg-[#0a0a0b] px-8">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(163,230,53,0.06) 0%, transparent 60%)',
        }}
        aria-hidden
      />
      <div className="map-skeleton-pulse relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-charcoal">
        <span className="text-2xl">📖</span>
      </div>
      <p className="relative z-10 font-body text-sm text-white/50">
        Cargando tu álbum…
      </p>
    </div>
  )
}
