import { memo } from 'react'
import { getRarity } from '../../theme/rarity'
import { typeClasses } from '../../theme/typography'
import { RarityBadge } from '../ui/RarityBadge'
import { ShineEffect } from '../ui/ShineEffect'

function PremiumRewardCardInner({ figure, photoUrl, revealed = true }) {
  const rarity = getRarity(figure.rareza)

  return (
    <div className="relative w-[280px]" style={{ perspective: 1200 }}>
      {/* Outer halo */}
      <div
        className="absolute -inset-4 rounded-[1.75rem] opacity-80"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${rarity.colors.glow}, transparent 65%)`,
        }}
        aria-hidden
      />

      <div
        className={`card-texture relative overflow-hidden rounded-[1.25rem] border-2 bg-gradient-to-b ${rarity.tailwind.gradient} ${rarity.tailwind.border} ${rarity.tailwind.glow}`}
      >
        <ShineEffect active={revealed} rarityShine={rarity.tailwind.shine} />

        {/* Corner accents */}
        <div className={`absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 ${rarity.tailwind.border}`} />
        <div className={`absolute right-3 top-3 h-5 w-5 border-r-2 border-t-2 ${rarity.tailwind.border}`} />
        <div className={`absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2 ${rarity.tailwind.border}`} />
        <div className={`absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2 ${rarity.tailwind.border}`} />

        {/* Header strip */}
        <div className="relative flex items-center justify-between px-5 pt-5">
          <RarityBadge rareza={figure.rareza} size="md" />
          <span className="text-2xl drop-shadow-md">{figure.emoji}</span>
        </div>

        {/* Photo frame — FIFA style */}
        <div className="relative mx-5 mt-4">
          <div
            className={`overflow-hidden rounded-xl border-2 ${rarity.tailwind.border} bg-black/40 p-1`}
          >
            <div
              className={`photo-reveal overflow-hidden rounded-lg ${revealed ? 'photo-revealed' : 'photo-hidden'}`}
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={figure.nombre}
                  decoding="async"
                  className="aspect-[4/5] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center bg-charcoal text-6xl">
                  {figure.emoji}
                </div>
              )}
            </div>
          </div>

          {/* Inner shine line */}
          <div className="pointer-events-none absolute inset-x-3 top-2 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>

        {/* Info */}
        <div className="relative px-5 py-5 text-center">
          <p className={`${typeClasses.micro} mb-2 text-white/50`}>
            San Fernando
          </p>
          <h2 className={`${typeClasses.display} text-xl text-warm-white`}>
            {figure.nombre}
          </h2>
          <p className="mt-2 font-body text-xs leading-relaxed text-white/55">
            {figure.description}
          </p>
        </div>

        {/* Bottom accent bar */}
        <div className={`h-1 w-full ${rarity.tailwind.accent}`} />
      </div>
    </div>
  )
}

export const PremiumRewardCard = memo(PremiumRewardCardInner)
