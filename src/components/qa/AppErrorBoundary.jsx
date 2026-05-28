import { Component } from 'react'
import { useExplorationStore } from '../../store/explorationStore'
import { logDiagnostic } from '../../utils/diagnostics'
import {
  capturePipelineError,
  getCapturePipelineSnapshot,
} from '../../utils/capturePipelineTrace'

function clearRecoveryState() {
  try {
    useExplorationStore.getState().stopExploration()
  } catch {
    // ignore
  }
}

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    const pipeline = getCapturePipelineSnapshot()
    logDiagnostic('error-boundary', {
      error: error?.message,
      stack: error?.stack,
      componentStack: info?.componentStack,
      capturePipeline: pipeline,
    })
    capturePipelineError(error, info, { boundary: 'AppErrorBoundary' })
    if (!import.meta.env.DEV) {
      console.error('[error-boundary]', error?.message)
    }
  }

  /** Hard navigation — sin Framer Motion ni estado React intermedio. */
  recover = (path = '/') => {
    clearRecoveryState()
    window.location.replace(path)
  }

  handleGoHome = () => {
    this.recover('/')
  }

  handleReload = () => {
    clearRecoveryState()
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-app screen-full safe-top safe-bottom safe-x flex flex-col items-center justify-center px-8 text-center">
          <p className="text-app font-display text-xl font-bold">Algo salió mal</p>
          <p className="text-app-muted mt-3 max-w-sm font-body text-sm leading-relaxed">
            La app encontró un error inesperado. Podés volver al inicio o recargar para continuar.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-4 max-h-32 w-full overflow-auto rounded-xl bg-black/40 p-3 text-left text-[10px] text-red-300">
              {this.state.error.message}
            </pre>
          )}
          <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
            <button
              type="button"
              onClick={this.handleGoHome}
              className="font-display w-full rounded-xl bg-progress px-5 py-4 text-sm font-black uppercase tracking-wide text-ink"
            >
              Volver al inicio
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="font-display w-full rounded-xl border border-border bg-warm-white px-5 py-4 text-sm font-semibold uppercase tracking-wide text-ink"
            >
              Recargar app
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
