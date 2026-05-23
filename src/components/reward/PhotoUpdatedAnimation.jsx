import { m } from 'framer-motion'
import { getRarity } from '../../theme/rarity'
import { typeClasses } from '../../theme/typography'

export function PhotoUpdatedAnimation({ figure, photoUrl, onComplete }) {
  const rarity = getRarity(figure?.rareza ?? figure?.rarity ?? 'común')

  return (
    <div className="safe-top safe-bottom relative flex h-full flex-col items-center justify-center overflow-hidden bg-zinc-950 px-6 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: `radial-gradient(circle at 50% 35%, ${rarity.colors.primary}55, transparent 55%)` }}
        aria-hidden
      />

      <m.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-xs"
      >
        <div
          className={`mx-auto overflow-hidden rounded-[1.5rem] border-2 ${rarity.tailwind.border} bg-black/30 p-2 shadow-[0_18px_48px_rgba(0,0,0,0.35)]`}
          style={{ boxShadow: `0 18px 48px rgba(0,0,0,0.35), ${rarity.cssGlow}` }}
        >
          {photoUrl ? (
            <img src={photoUrl} alt={figure?.nombre ?? figure?.title ?? 'Figurita'} className="aspect-[3/4] w-full rounded-xl object-cover" />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center text-5xl">{figure?.emoji ?? '📸'}</div>
          )}
        </div>

        <m.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.3 }}
          className={`${typeClasses.display} mt-6 text-2xl text-warm-white`}
        >
          ¡Foto actualizada!
        </m.h1>
        <m.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.3 }}
          className={`${typeClasses.label} mt-3 text-progress`}
        >
          {figure?.nombre ?? figure?.title ?? 'Tu figurita'} quedó con una foto nueva.
        </m.p>
      </m.div>

      <m.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        onClick={onComplete}
        className="relative z-10 mt-10 rounded-full bg-progress px-6 py-3 text-sm font-black text-ink"
      >
        Volver al álbum
      </m.button>
    </div>
  )
}
