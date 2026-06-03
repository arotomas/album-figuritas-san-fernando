import { useMemo } from 'react'
import { m } from 'framer-motion'
import { getRarity } from '../../theme/rarity'
import { getPointsBurstTier } from '../../utils/figurePoints'
import { motion as motionTokens } from '../../theme/motion'

const TIER_STYLES = {
  común: {
    textClass: 'text-2xl font-black tracking-tight text-progress sm:text-3xl',
    badge: null,
    glow: '0 0 24px rgba(140, 198, 63, 0.35)',
    scalePeak: 1.08,
    duration: 1.1,
  },
  rara: {
    textClass: 'text-3xl font-black tracking-tight sm:text-4xl',
    badge: 'Ganaste',
    glow: '0 0 32px rgba(34, 211, 238, 0.45)',
    scalePeak: 1.12,
    duration: 1.25,
  },
  épica: {
    textClass: 'text-4xl font-black tracking-tight sm:text-5xl',
    badge: 'Ganaste',
    glow: '0 0 40px rgba(167, 139, 250, 0.55)',
    scalePeak: 1.16,
    duration: 1.35,
  },
  legendaria: {
    textClass: 'text-4xl font-black tracking-tight sm:text-[3.25rem]',
    badge: 'Ganaste',
    glow: '0 0 48px rgba(251, 191, 36, 0.55)',
    scalePeak: 1.2,
    duration: 1.45,
  },
  bonus: {
    textClass: 'text-[2.5rem] font-black tracking-tight sm:text-6xl',
    badge: 'Bonus',
    glow: '0 0 56px rgba(250, 204, 21, 0.65)',
    scalePeak: 1.24,
    duration: 1.55,
  },
}

function getTierStyle(tier) {
  return TIER_STYLES[tier] ?? TIER_STYLES.común
}

export function PointsBurstOverlay({ figure, points, reduced = false }) {
  const tier = getPointsBurstTier(figure)
  const style = getTierStyle(tier)
  const rarity = getRarity(figure?.rareza ?? figure?.rarity ?? 'común')

  const ariaMessage = useMemo(() => {
    if (tier === 'común') return `Ganaste ${points} puntos`
    if (tier === 'bonus') return `Bonus: ganaste ${points} puntos`
    return `Ganaste ${points} puntos`
  }, [points, tier])

  if (!points || points <= 0) return null

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[12%] z-30 flex justify-center px-4"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="sr-only">{ariaMessage}</span>

      <m.div
        initial={
          reduced
            ? { opacity: 0 }
            : { opacity: 0, scale: 0.72, y: 18 }
        }
        animate={
          reduced
            ? { opacity: 1 }
            : {
                opacity: [0, 1, 1, 0],
                scale: [0.72, style.scalePeak, 1, 0.96],
                y: [18, 0, -4, -10],
              }
        }
        transition={
          reduced
            ? { duration: 0.35, ease: 'easeOut' }
            : {
                duration: style.duration,
                ease: motionTokens.ease.premium,
                times: [0, 0.18, 0.72, 1],
              }
        }
        className="flex max-w-[92vw] flex-col items-center text-center"
        aria-hidden="true"
      >
        {style.badge && (
          <span
            className="mb-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/90"
            style={{
              backgroundColor: `${rarity.colors.primary}33`,
              border: `1px solid ${rarity.colors.primary}55`,
            }}
          >
            {style.badge}
          </span>
        )}

        <span
          className={`rounded-2xl px-4 py-2 ${style.textClass}`}
          style={{
            textShadow: style.glow,
            color: tier === 'común' ? undefined : rarity.colors.primary,
          }}
        >
          +{points} pts
        </span>

        {tier === 'bonus' && (
          <m.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: reduced ? 0 : 0.12, duration: 0.3 }}
            className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-yellow-200/90"
          >
            Máximo bonus
          </m.span>
        )}
      </m.div>
    </div>
  )
}
