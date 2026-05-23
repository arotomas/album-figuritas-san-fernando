import { useNavigate, useLocation } from 'react-router-dom'
import { m } from 'framer-motion'
import { Logo } from '../components/Logo'
import { Button } from '../components/Button'
import { splashDescription } from '../data/mockFigures'
import { motion as motionTokens } from '../theme/motion'
import { typeClasses } from '../theme/typography'
import { ParticleLayer } from '../components/ui/ParticleLayer'

export function SplashScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const loginPath = location.search ? `/login${location.search}` : '/login'

  return (
    <div className="screen-full safe-top safe-bottom safe-x relative flex flex-col items-center justify-between overflow-hidden bg-warm-white px-8 py-10">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(140,198,63,0.08) 0%, transparent 55%)',
        }}
        aria-hidden
      />

      <ParticleLayer rareza="rara" intensity={0.3} className="opacity-40" />

      <Logo size="lg" className="relative z-10 mt-8" />

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.6, ease: motionTokens.ease.premium }}
        className={`${typeClasses.body} relative z-10 max-w-xs px-2 text-center text-muted`}
      >
        {splashDescription}
      </m.div>

      <m.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5, ease: motionTokens.ease.out }}
        className="relative z-10 w-full max-w-sm"
      >
        <Button variant="primary" onClick={() => navigate(loginPath)}>
          Ingresar
        </Button>
      </m.div>
    </div>
  )
}
