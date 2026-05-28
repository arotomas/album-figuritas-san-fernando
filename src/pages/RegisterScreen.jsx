import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AuthBrandHeader } from '../components/auth'
import { Button } from '../components/Button'
import { ProfileFormFields } from '../components/profile/ProfileFormFields'
import { useAuth } from '../hooks/useAuth'
import { staggerContainer, staggerItem } from '../animations/pageTransition'
import { validateRegistrationForm } from '../utils/profileValidation'
import { profileSetupLog } from '../utils/profileSetupLog'

const EMPTY_FORM = {
  nombre: '',
  apellido: '',
  dni: '',
  email: '',
  celular: '',
  username: '',
  password: '',
  confirmPassword: '',
}

export function RegisterScreen() {
  const { register, isSubmitting } = useAuth()
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    const errors = validateRegistrationForm(form, selectedAddress)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      profileSetupLog.error('register validation failed', errors)
      return
    }

    profileSetupLog.info('register submit', { email: form.email.trim() })
    const result = await register({ form, address: selectedAddress })
    if (!result.ok) setError(result.message)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-8 pt-1">
      <AuthBrandHeader className="mb-6" />

      <motion.form
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-md space-y-5 pb-8"
      >
        <motion.div variants={staggerItem} className="text-center">
          <h1 className="font-display text-2xl font-bold text-ink">Creá tu perfil de explorador</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Tus datos nos ayudan a validar premios y participación. Tu dirección no será pública.
          </p>
        </motion.div>

        <motion.div variants={staggerItem}>
          <ProfileFormFields
            form={form}
            fieldErrors={fieldErrors}
            onChange={updateField}
            onAddressSelect={setSelectedAddress}
            selectedAddress={selectedAddress}
            showEmail
            showPassword
          />
        </motion.div>

        {error && (
          <motion.p variants={staggerItem} className="text-center text-sm font-medium text-red-600">
            {error}
          </motion.p>
        )}

        <motion.div variants={staggerItem}>
          <Button type="submit" variant="progress" disabled={isSubmitting}>
            {isSubmitting ? 'Creando cuenta…' : 'Registrarme'}
          </Button>
        </motion.div>

        <motion.p variants={staggerItem} className="text-center text-sm text-muted">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="font-semibold text-ink underline">
            Ingresar
          </Link>
        </motion.p>
      </motion.form>
    </div>
  )
}
