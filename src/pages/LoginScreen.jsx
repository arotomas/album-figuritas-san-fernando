import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaGoogle, FaFacebook, FaXTwitter } from 'react-icons/fa6'
import { Logo } from '../components/Logo'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { useAuth } from '../hooks/useAuth'
import { staggerContainer, staggerItem } from '../animations/pageTransition'

const socialProviders = [
  { id: 'google', label: 'Gmail', icon: FaGoogle },
  { id: 'facebook', label: 'Facebook', icon: FaFacebook },
  { id: 'x', label: 'X', icon: FaXTwitter },
]

export function LoginScreen() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    login({ username, password })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-between px-8 py-10">
      <Logo size="lg" className="mb-8 mt-2 shrink-0" />

      <motion.form
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6"
      >
        <motion.div variants={staggerItem}>
          <Input
            id="username"
            label="Usuario"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Tu usuario"
            autoComplete="username"
          />
        </motion.div>

        <motion.div variants={staggerItem}>
          <Input
            id="password"
            label="Contraseña"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </motion.div>

        <motion.div variants={staggerItem}>
          <Button type="submit">Ingresar</Button>
        </motion.div>

        <motion.p variants={staggerItem} className="text-center text-sm text-ink">
          No tengo usuario,{' '}
          <Link to="/login" className="font-bold underline-offset-2 hover:underline">
            quiero darme de alta.
          </Link>
        </motion.p>
      </motion.form>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mx-auto w-full max-w-sm shrink-0 pb-2"
      >
        <p className="mb-4 text-center text-sm text-muted">Ingresar con:</p>
        <div className="flex items-center justify-center gap-6">
          {socialProviders.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-label={`Ingresar con ${label}`}
              onClick={() => login({ username: label })}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-ink transition-colors hover:bg-border/40"
            >
              <Icon size={20} />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
