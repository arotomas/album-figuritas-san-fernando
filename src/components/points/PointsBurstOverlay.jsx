import { useMemo } from 'react'
import { m } from 'framer-motion'
import { getRarity } from '../../theme/rarity'
import { getPointsBurstTier } from '../../utils/figurePoints'
import { motion as motionTokens } from '../../theme/motion'
import { typeClasses } from '../../theme/typography'

const TIER_COPY = {
  común: {
    headline: '¡Ganaste!',
    duration: 3,
    scalePeak: 1.06,
    headlineClass: 'text-xl font-bold tracking-wide text-white sm:text-2xl',
    pointsClass: 'text-3xl font-black tracking-tight text-progress sm:text-4xl',
  },
  rara: {
    headline: '¡Ganaste!',
    duration: 3.1,
    scalePeak: 1.08,
    headlineClass: 'text-xl font-bold tracking-wide text-cyan-100 sm:text-2xl',
    pointsClass: 'text-3xl font-black tracking-tight text-cyan-300 sm:text-[2.5rem]',
  },
  épica: {
    headline: '¡Gran hallazgo!',
    duration: 3.2,
    scalePeak: 1.1,
    headlineClass: 'text-xl font-bold tracking-wide text-violet-100 sm:text-2xl',
    pointsClass: 'text-4xl font-black tracking-tight text-violet-200 sm:text-[2.75rem]',
  },
  legendaria: {
    headline: '¡Legendaria!',
    duration: 3.35,
    scalePeak: 1.12,
    headlineClass: 'text-xl font-bold tracking-wide text-amber-100 sm:text-2xl',
    pointsClass: 'text-4xl font-black tracking-tight text-amber-200 sm:text-[2.85rem]',
  },
  bonus: {
    headline: '¡Bonus especial!',
    duration: 3.5,
    scalePeak: 1.14,
    headlineClass: 'text-xl font-bold tracking-wide text-yellow-100 sm:text-2xl',
    pointsClass: 'text-[2.5rem] font-black tracking-tight text-yellow-200 sm:text-5xl',
  },
}

const REDUCED_VISIBLE_MS = 2800

function getTierCopy(tier) {
  return TIER_COPY[tier] ?? TIER_COPY.común
}

export function PointsBurstOverlay({ figure, points, reduced = false }) {
  const tier = getPointsBurstTier(figure)
  const copy = getTierCopy(tier)
  const rarity = getRarity(figure?.rareza ?? figure?.rarity ?? 'común')

  const ariaMessage = useMemo(
    () => `${copy.headline} ${points} puntos`,
    [copy.headline, points],
  )

  if (!points || points <= 0) return null

  const enterEnd = 0.14
  const holdEnd = 0.78

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[10%] z-30 flex justify-center px-4 sm:top-[11%]"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="sr-only">{ariaMessage}</span>

      <m.div
        initial={
          reduced
            ? { opacity: 0, scale: 0.96 }
            : { opacity: 0, scale: 0.78, y: 16 }
        }
        animate={
          reduced
            ? { opacity: [0, 1, 1, 0], scale: 1 }
            : {
                opacity: [0, 1, 1, 1, 0],
                scale: [0.78, copy.scalePeak, 1, 1, 0.98],
                y: [16, 0, 0, 0, -6],
              }
        }
        transition={
          reduced
            ? {
                duration: REDUCED_VISIBLE_MS / 1000,
                ease: 'easeInOut',
                times: [0, 0.12, 0.82, 1],
              }
            : {
                duration: copy.duration,
                ease: motionTokens.ease.premium,
                times: [0, enterEnd, enterEnd + 0.02, holdEnd, 1],
              }
        }
        className="max-w-[min(92vw,20rem)]"
        aria-hidden="true"
      >
        <div
          className="rounded-2xl border px-5 py-4 text-center shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-md"
          style={{
            borderColor: `${rarity.colors.primary}44`,
            background: `linear-gradient(180deg, rgba(10,10,12,0.82) 0%, rgba(10,10,12,0.68) 100%)`,
            boxShadow: `0 16px 40px rgba(0,0,0,0.35), ${copy.duration >= 3.2 ? `0 0 32px ${rarity.colors.glow}` : 'none'}`,
          }}
        >
          <p className={`${typeClasses.label} ${copy.headlineClass}`}>
            {copy.headline}
          </p>
          <p
            className={`mt-1 ${copy.pointsClass}`}
            style={{
              textShadow:
                tier === 'común'
                  ? '0 0 20px rgba(140, 198, 63, 0.45)'
                  : `0 0 24px ${rarity.colors.glow}`,
            }}
          >
            +{points} pts
          </p>
        </div>
      </m.div>
    </div>
  )
}
