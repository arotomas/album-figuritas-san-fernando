import { Link } from 'react-router-dom'

export function LegalNotice({ className = '' }) {
  return (
    <div className={`text-center text-xs leading-5 text-muted ${className}`}>
      <p>Al usar esta app aceptás los</p>
      <p className="mt-0.5">
        <Link to="/terms" className="font-medium text-ink/80 underline underline-offset-2">
          Términos y Condiciones
        </Link>
        <span aria-hidden="true"> · </span>
        <Link to="/privacy" className="font-medium text-ink/80 underline underline-offset-2">
          Política de Privacidad
        </Link>
      </p>
    </div>
  )
}
