import { useState } from 'react'
import { Logo } from '../components/Logo'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { useAuth } from '../hooks/useAuth'
import { validatePassword, validatePasswordMatch } from '../utils/profileValidation'

export function ResetPasswordScreen() {
  const { resetPassword, isSubmitting } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    const passwordError = validatePassword(password)
    const confirmError = validatePasswordMatch(password, confirmPassword)
    if (passwordError || confirmError) {
      setError(passwordError ?? confirmError)
      return
    }

    const result = await resetPassword(password)
    if (!result.ok) setError(result.message)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-8 py-10">
      <Logo size="md" className="mx-auto mb-8" />
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-ink">Nueva contraseña</h1>
          <p className="mt-2 text-sm text-muted">Elegí una contraseña segura para tu cuenta.</p>
        </div>

        <Input
          id="password"
          label="Nueva contraseña"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
        />
        <Input
          id="confirmPassword"
          label="Repetir contraseña"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
        />

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <Button type="submit" disabled={isSubmitting || !password || !confirmPassword}>
          {isSubmitting ? 'Guardando…' : 'Actualizar contraseña'}
        </Button>
      </form>
    </div>
  )
}
