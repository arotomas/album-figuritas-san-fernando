import { m } from 'framer-motion'
import { typeClasses } from '../theme/typography'
import { motion as motionTokens } from '../theme/motion'

export function Logo({ className = '', size = 'md' }) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  }

  return (
    <m.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: motionTokens.ease.premium }}
      className={`text-center ${className}`}
    >
      <p className={`${typeClasses.micro} text-muted`}>San Fernando</p>
      <p
        className={`font-display font-bold tracking-tight text-ink ${sizeClasses[size]}`}
      >
        Álbum de Figuritas
      </p>
    </m.div>
  )
}
