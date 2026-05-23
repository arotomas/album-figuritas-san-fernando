import { useState } from 'react'
import { motion } from 'framer-motion'
import { Logo } from '../components/Logo'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { AddressAutocomplete } from '../components/profile/AddressAutocomplete'
import { useAuth } from '../hooks/useAuth'
import { authLog } from '../utils/authLog'
import { AuthDebugPanel } from '../components/debug/AuthDebugPanel'
import { staggerContainer, staggerItem } from '../animations/pageTransition'
import { hasValidAddress } from '../utils/parseGooglePlace'

const SERVER_ERROR_MESSAGE =
  'No pudimos conectar con el servidor. Probá de nuevo.'

export function LoginScreen() {
  const { login, isSubmitting } = useAuth()
  const [username, setUsername] = useState('')
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    const trimmed = username.trim()
    if (!trimmed) {
      setError('Escribí tu nombre o apodo para entrar.')
      return
    }

    if (!hasValidAddress(selectedAddress)) {
      setError('Elegí tu dirección de la lista de sugerencias.')
      return
    }

    authLog.info('login submit', { username: trimmed })

    const result = await login({ username: trimmed, address: selectedAddress })
    if (!result.ok) {
      setError(result.message ?? SERVER_ERROR_MESSAGE)
    }
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
        <motion.div variants={staggerItem} className="text-center">
          <h1 className="font-display text-2xl font-bold text-ink">Entrá al álbum</h1>
          <p className="mt-2 text-sm text-muted">
            Elegí un nombre y tu dirección para guardar tu progreso en la zona.
          </p>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Input
            id="username"
            label="Nombre o apodo"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Ej: Toto, Fer, Explorador"
            autoComplete="nickname"
            maxLength={32}
          />
        </motion.div>

        <motion.div variants={staggerItem}>
          <AddressAutocomplete
            onAddressSelect={setSelectedAddress}
            required
            helperText="Buscá calles y barrios de Zona Norte. Elegí una sugerencia."
          />
        </motion.div>

        {error && (
          <motion.div variants={staggerItem} className="space-y-2">
            <p className="text-center text-sm font-medium text-red-600">{error}</p>
          </motion.div>
        )}

        <motion.div variants={staggerItem}>
          <Button type="submit" disabled={isSubmitting || !username.trim() || !hasValidAddress(selectedAddress)}>
            {isSubmitting ? 'Verificando con Supabase…' : 'Entrar'}
          </Button>
        </motion.div>

        <motion.div variants={staggerItem}>
          <AuthDebugPanel />
        </motion.div>
      </motion.form>

      <p className="mx-auto w-full max-w-sm shrink-0 pb-2 text-center text-xs text-muted">
        Tu progreso se guarda en este dispositivo y en la nube.
      </p>
    </div>
  )
}
