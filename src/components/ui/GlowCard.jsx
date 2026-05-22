import { memo } from 'react'
import { getRarity } from '../../theme/rarity'

function GlowCardInner({
  rareza,
  children,
  className = '',
  active = false,
  as: Tag = 'div',
  ...props
}) {
  const rarity = getRarity(rareza)

  return (
    <Tag
      className={`relative ${active ? rarity.tailwind.glow : ''} ${className}`}
      style={active ? { boxShadow: rarity.cssGlow } : undefined}
      {...props}
    >
      {active && (
        <div
          className="pointer-events-none absolute -inset-1 rounded-[inherit] opacity-60"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${rarity.colors.glow}, transparent 70%)`,
          }}
          aria-hidden
        />
      )}
      {children}
    </Tag>
  )
}

export const GlowCard = memo(GlowCardInner)
