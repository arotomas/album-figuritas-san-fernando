import { Link } from 'react-router-dom'

export function LegalNotice({ className = '' }) {
  return (
    <p className={`text-center text-xs leading-5 text-muted ${className}`}>
      Al usar esta app aceptás los{' '}
      <Link to="/terms" className="font-medium text-ink/80 underline underline-offset-2">
        Términos y Condiciones
      </Link>{' '}
      y la{' '}
      <Link to="/privacy" className="font-medium text-ink/80 underline underline-offset-2">
        Política de Privacidad
      </Link>
      .
    </p>
  )
}
