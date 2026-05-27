import { Component } from 'react'
import { capturePipelineError, capturePipelineTrace } from '../../utils/capturePipelineTrace'

/**
 * Fail-safe local: figurita ya guardada → degradar reward sin tumbar la app.
 * No reemplaza AppErrorBoundary global.
 */
export class CaptureRewardErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    capturePipelineError(error, info, {
      boundary: 'CaptureRewardErrorBoundary',
      degradeReason: this.props.degradeReason ?? 'reward-render',
    })
    capturePipelineTrace('CAPTURE', 'reward degrade triggered', {
      reason: this.props.degradeReason ?? 'reward-render',
    })
    this.props.onDegrade?.(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="safe-top safe-bottom flex h-full flex-col items-center justify-center bg-[#0a0a0b] px-8 text-center">
          <p className="font-display text-xl font-bold text-warm-white">
            ¡Figurita guardada!
          </p>
          <p className="mt-3 max-w-sm font-body text-sm leading-relaxed text-white/55">
            Hubo un problema mostrando la animación. Tu foto ya está en el álbum.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
