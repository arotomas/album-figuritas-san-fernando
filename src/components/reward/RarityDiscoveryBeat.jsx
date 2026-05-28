import { memo } from 'react'
import { m } from 'framer-motion'
import { motion as motionTokens } from '../../theme/motion'
import { typeClasses } from '../../theme/typography'
import { getRarityDiscoveryContent } from '../../utils/rarityDiscovery'

function RarityDiscoveryBeatInner({ figure, visible = true }) {
  const content = getRarityDiscoveryContent(figure)
  if (!content) return null

  const { rarity, headline, subline, reassurance } = content

  return (
    <div className="safe-top safe-bottom absolute inset-0 z-40 flex flex-col items-center justify-center px-8 text-center">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 44%, ${rarity.colors.glow} 0%, transparent 58%)`,
          opacity: 0.45,
        }}
        aria-hidden
      />

      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: -4 }}
        transition={{ duration: 0.52, ease: motionTokens.ease.premium }}
        className="relative z-10 flex max-w-sm flex-col items-center"
      >
        <m.span
          initial={{ opacity: 0 }}
          animate={visible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.42, delay: 0.06, ease: motionTokens.ease.out }}
          className={`${typeClasses.micro} mb-4 rounded-full border px-3.5 py-1.5 uppercase tracking-[0.18em]`}
          style={{
            color: `${rarity.colors.primary}dd`,
            borderColor: `${rarity.colors.primary}33`,
            backgroundColor: `${rarity.colors.glow}12`,
          }}
        >
          Hallazgo especial
        </m.span>

        <m.h2
          initial={{ opacity: 0, y: 6 }}
          animate={visible ? { opacity: 1, y: 0 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: motionTokens.ease.premium }}
          className={`${typeClasses.headline} text-[1.35rem] font-semibold leading-snug tracking-tight`}
          style={{ color: rarity.colors.primary }}
        >
          {headline}
        </m.h2>

        <m.p
          initial={{ opacity: 0 }}
          animate={visible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.45, delay: 0.2, ease: motionTokens.ease.out }}
          className="mt-2.5 font-body text-sm leading-relaxed text-muted"
        >
          {subline}
        </m.p>

        {figure?.nombre && (
          <m.p
            initial={{ opacity: 0 }}
            animate={visible ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.28 }}
            className="mt-2 font-body text-[15px] font-medium text-warm-white/88"
          >
            {figure.nombre}
          </m.p>
        )}

        <m.p
          initial={{ opacity: 0 }}
          animate={visible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.36, ease: motionTokens.ease.out }}
          className="mt-5 font-body text-[11px] tracking-wide text-muted"
        >
          {reassurance}
        </m.p>
      </m.div>
    </div>
  )
}

export const RarityDiscoveryBeat = memo(RarityDiscoveryBeatInner)
