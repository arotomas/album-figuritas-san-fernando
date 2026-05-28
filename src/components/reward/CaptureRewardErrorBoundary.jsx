import { Component } from 'react'
import {
  capturePipelineError,
  capturePipelineTrace,
  unlockTrace,
} from '../../utils/capturePipelineTrace'

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
    unlockTrace('reward boundary degrade', {
      reason: this.props.degradeReason ?? 'reward-render',
    })
    capturePipelineTrace('CAPTURE', 'reward degrade triggered', {
      reason: this.props.degradeReason ?? 'reward-render',
    })
    try {
      this.props.onDegrade?.(error)
    } catch (degradeError) {
      unlockTrace('onDegrade threw', { message: degradeError?.message })
      const target = '/my-figures'
      window.location.href = target
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-app safe-top safe-bottom flex h-full flex-col items-center justify-center px-8 text-center">
          <p className="text-app font-display text-xl font-bold">
            ¡Figurita guardada!
          </p>
          <p className="text-app-muted mt-3 max-w-sm font-body text-sm leading-relaxed">
            Hubo un problema mostrando la animación. Tu foto ya está en el álbum.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
