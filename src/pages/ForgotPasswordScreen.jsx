import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthBrandHeader } from '../components/auth'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { useAuth } from '../hooks/useAuth'
import { validateEmail } from '../utils/profileValidation'

export function ForgotPasswordScreen() {
  const { forgotPassword, isSubmitting } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setSuccess(false)

    const emailError = validateEmail(email)
    if (emailError) {
      setError(emailError)
      return
    }

    const result = await forgotPassword(email.trim())
    if (!result.ok) {
      setError(result.message)
      return
    }
    setSuccess(true)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-8 pb-10 pt-1">
      <AuthBrandHeader className="mb-8" />
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-ink">Recuperar contraseña</h1>
          <p className="mt-2 text-sm text-muted">
            Te enviaremos un link para crear una nueva contraseña.
          </p>
        </div>

        <Input
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@email.com"
          autoComplete="email"
        />

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        {success && (
          <p className="rounded-xl border border-progress/30 bg-progress/10 p-3 text-sm text-ink">
            Revisá tu email. Si existe una cuenta, vas a recibir instrucciones para resetear la
            contraseña.
          </p>
        )}

        <Button type="submit" variant="progress" disabled={isSubmitting || !email.trim()}>
          {isSubmitting ? 'Enviando…' : 'Enviar link'}
        </Button>

        <p className="text-center text-sm text-muted">
          <Link to="/login" className="font-semibold text-ink underline">
            Volver al login
          </Link>
        </p>
      </form>
    </div>
  )
}
