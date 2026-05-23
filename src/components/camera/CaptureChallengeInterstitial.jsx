import { m } from 'framer-motion'
import { getFigureChallenge } from '../../utils/figureChallenges'
import { typeClasses } from '../../theme/typography'

export function CaptureChallengeInterstitial({ figure, onContinue, onClose }) {
  const challenge = getFigureChallenge(figure)

  if (!challenge) {
    onContinue?.()
    return null
  }

  return (
    <div className="safe-top safe-bottom relative flex h-full flex-col overflow-hidden bg-zinc-950 text-warm-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(140,198,63,0.18),transparent_55%)]" />

      <header className="relative z-10 flex items-center justify-between px-5 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white/75"
        >
          Volver
        </button>
        <span className="rounded-full bg-progress/15 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-progress">
          Misión
        </span>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center px-5 py-6">
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="mx-auto w-full max-w-md"
        >
          <p className={`${typeClasses.micro} text-progress`}>📸 Cómo capturar esta figurita</p>
          <h1 className={`${typeClasses.display} mt-3 text-3xl leading-tight text-warm-white`}>
            {challenge.title}
          </h1>
          <p className="mt-4 font-body text-base leading-7 text-white/78">
            {challenge.description}
          </p>
          {challenge.extraTip && (
            <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white/60">
              {challenge.extraTip}
            </p>
          )}

          {challenge.exampleUrl && (
            <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/30 p-2">
              <img
                src={challenge.exampleUrl}
                alt="Ejemplo de captura"
                className="aspect-[4/3] w-full rounded-xl object-cover"
              />
              <p className="mt-2 px-1 text-center text-[11px] font-semibold uppercase tracking-wide text-white/45">
                Ejemplo de referencia
              </p>
            </div>
          )}
        </m.div>
      </div>

      <div className="relative z-10 px-5 pb-6">
        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-2xl bg-progress px-5 py-4 text-base font-black text-ink shadow-[0_0_28px_rgba(140,198,63,0.24)]"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}
