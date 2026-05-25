import { m } from 'framer-motion'

const PHASE_COPY = {
  album: 'Cargando tu álbum…',
  session: 'Restaurando sesión…',
  ready: 'Preparando experiencia…',
}

export function AppBootScreen({ phase = 'album' }) {
  const message = PHASE_COPY[phase] ?? PHASE_COPY.album

  return (
    <div className="screen-full safe-top safe-bottom safe-x relative flex flex-col items-center justify-center overflow-hidden bg-[#0a0a0b] px-8">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 42%, rgba(140,198,63,0.08) 0%, transparent 62%)',
        }}
        aria-hidden
      />

      <m.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mb-7 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.35rem] border border-white/10 bg-charcoal shadow-[0_0_40px_rgba(140,198,63,0.12)]"
      >
        <img
          src="/favicon.svg"
          alt=""
          aria-hidden
          className="h-10 w-10"
          draggable={false}
        />
        <m.span
          className="absolute inset-0 rounded-[1.35rem] border border-progress/30"
          animate={{ opacity: [0.25, 0.65, 0.25], scale: [1, 1.06, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        />
      </m.div>

      <m.p
        key={phase}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 font-body text-sm tracking-wide text-white/60"
      >
        {message}
      </m.p>
    </div>
  )
}
