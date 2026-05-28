import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AuthBrandHeader } from '../components/auth'
import { Button } from '../components/Button'
import { ProfileFormFields } from '../components/profile/ProfileFormFields'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../store/useAppStore'
import { staggerContainer, staggerItem } from '../animations/pageTransition'
import { validateProfileSetupForm } from '../utils/profileValidation'
import { profileSetupLog } from '../utils/profileSetupLog'

export function ProfileSetupScreen() {
  const { completeProfile, isSubmitting } = useAuth()
  const supabaseProfile = useAppStore((state) => state.supabaseProfile)
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    email: '',
    celular: '',
    username: '',
  })
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabaseProfile) return
    setForm({
      nombre: supabaseProfile.nombre ?? '',
      apellido: supabaseProfile.apellido ?? '',
      dni: supabaseProfile.dni ?? '',
      email: supabaseProfile.email ?? '',
      celular: supabaseProfile.celular ?? '',
      username: supabaseProfile.username ?? '',
    })
    if (supabaseProfile.direccion_texto) {
      setSelectedAddress({
        direccion_texto: supabaseProfile.direccion_texto,
        direccion_lat: supabaseProfile.direccion_lat,
        direccion_lng: supabaseProfile.direccion_lng,
        localidad: supabaseProfile.localidad,
        provincia: supabaseProfile.provincia,
        pais: supabaseProfile.pais,
        codigo_postal: supabaseProfile.codigo_postal,
      })
    }
  }, [supabaseProfile])

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    const errors = validateProfileSetupForm(form, selectedAddress)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      profileSetupLog.error('profile setup validation failed', errors)
      return
    }

    profileSetupLog.info('profile setup submit', { userId: supabaseProfile?.id ?? null })
    const result = await completeProfile({ form, address: selectedAddress })
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
        <motion.div variants={staggerItem} className="rounded-2xl border border-progress/25 bg-progress/10 p-4 text-center">
          <h1 className="font-display text-2xl font-bold text-ink">Completá tu perfil</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Antes de explorar el álbum necesitamos algunos datos para validar tu participación.
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
            emailReadOnly={Boolean(supabaseProfile?.email)}
          />
        </motion.div>

        {error && (
          <motion.p variants={staggerItem} className="text-center text-sm font-medium text-red-600">
            {error}
          </motion.p>
        )}

        <motion.div variants={staggerItem}>
          <Button type="submit" variant="progress" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando perfil…' : 'Empezar a explorar'}
          </Button>
        </motion.div>
      </motion.form>
    </div>
  )
}
