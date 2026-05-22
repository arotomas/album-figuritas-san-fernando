import { Component } from 'react'
import { logDiagnostic } from '../../utils/diagnostics'
import { PremiumButton } from '../ui/PremiumButton'

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    logDiagnostic('error-boundary', { error: error?.message, info })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="screen-full safe-top safe-bottom safe-x flex flex-col items-center justify-center bg-[#0a0a0b] px-8 text-center">
          <p className="font-display text-xl font-bold text-warm-white">
            Algo salió mal
          </p>
          <p className="mt-3 max-w-sm font-body text-sm leading-relaxed text-white/55">
            La app encontró un error inesperado. Podés reintentar o recargar para continuar.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-4 max-h-32 w-full overflow-auto rounded-xl bg-black/40 p-3 text-left text-[10px] text-red-300">
              {this.state.error.message}
            </pre>
          )}
          <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
            <PremiumButton variant="lime" onClick={this.handleRetry}>
              Reintentar
            </PremiumButton>
            <PremiumButton variant="ghost" onClick={this.handleReload}>
              Recargar app
            </PremiumButton>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
