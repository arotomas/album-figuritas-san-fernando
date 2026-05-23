import { memo } from 'react'
import { m } from 'framer-motion'
import { motion as motionTokens } from '../../theme/motion'

const variants = {
  primary:
    'bg-ink text-warm-white shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:bg-black',
  lime: 'bg-gradient-to-b from-progress to-progress text-ink shadow-[0_4px_20px_rgba(140,198,63,0.25)]',
  ghost: 'bg-transparent text-ink hover:bg-surface',
  outline: 'border border-border bg-warm-white text-ink hover:bg-surface',
  dark: 'bg-charcoal text-warm-white border border-white/10',
}

const sizes = {
  md: 'px-6 py-4 text-sm',
  lg: 'px-8 py-4 text-base',
  sm: 'px-4 py-2.5 text-sm',
}

function PremiumButtonInner({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <m.button
      whileTap={motionTokens.tap}
      whileHover={{ scale: 1.01 }}
      transition={motionTokens.spring.soft}
      type={type}
      className={`font-display inline-flex w-full items-center justify-center rounded-xl font-semibold uppercase tracking-wide transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </m.button>
  )
}

export const PremiumButton = memo(PremiumButtonInner)
