import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaGoogle } from 'react-icons/fa6'
import { AuthBrandHeader } from '../components/auth'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { useAuth } from '../hooks/useAuth'
import { staggerContainer, staggerItem } from '../animations/pageTransition'
import { authLog } from '../utils/authLog'
import { MapTreeDebugPanel } from '../components/debug/MapTreeDebugOverlay'
import { recordMapNavStep } from '../components/debug/mapNavAudit'

export function LoginScreen() {
  const { signIn, signInGoogle, completeOAuthIfNeeded, isSubmitting } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [oauthHandled, setOauthHandled] = useState(false)

  useEffect(() => {
    recordMapNavStep('LoginScreen mount', {
      pathname: '/login',
      search: typeof window !== 'undefined' ? window.location.search : '',
    })
  }, [])

  useEffect(() => {
    if (oauthHandled) return
    setOauthHandled(true)
    void completeOAuthIfNeeded().then((result) => {
      if (!result.ok && result.message) setError(result.message)
    })
  }, [completeOAuthIfNeeded, oauthHandled])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    authLog.info('login submit', { email: email.trim() })
    const result = await signIn({ email: email.trim(), password })
    if (!result.ok) setError(result.message)
  }

  const handleGoogle = async () => {
    setError(null)
    authLog.info('google login click')
    const result = await signInGoogle()
    if (!result.ok) setError(result.message)
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col justify-between px-8 pb-10 pt-1">
      <MapTreeDebugPanel source="/login" placement="right" stackIndex={0} />
      <AuthBrandHeader className="mb-6" />

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6"
      >
        <motion.div variants={staggerItem} className="text-center">
          <h1 className="font-display text-2xl font-bold text-ink">Entrá al álbum</h1>
          <p className="mt-2 text-sm text-muted">
            Ingresá con tu cuenta o continuá con Google.
          </p>
        </motion.div>

        <motion.form variants={staggerItem} onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
          />
          <Input
            id="password"
            label="Contraseña"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Tu contraseña"
            autoComplete="current-password"
          />

          <div className="text-right">
            <Link to="/forgot-password" className="text-sm font-medium text-ink underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {error && <p className="text-center text-sm font-medium text-red-600">{error}</p>}

          <Button
            type="submit"
            variant="progress"
            disabled={isSubmitting || !email.trim() || !password}
          >
            {isSubmitting ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </motion.form>

        <motion.div variants={staggerItem}>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleGoogle}>
            <span className="inline-flex items-center gap-2">
              <FaGoogle />
              Continuar con Google
            </span>
          </Button>
        </motion.div>

        <motion.p variants={staggerItem} className="text-center text-sm text-muted">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="font-semibold text-ink underline">
            Creá tu perfil de explorador
          </Link>
        </motion.p>
      </motion.div>
    </div>
  )
}
