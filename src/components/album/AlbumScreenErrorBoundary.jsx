import { Component } from 'react'
import { capturePipelineError, albumTrace } from '../../utils/capturePipelineTrace'
import { PremiumButton } from '../ui/PremiumButton'

function mapPathWithQa() {
  try {
    if (sessionStorage.getItem('album-qa-mode') === '1') {
      return '/map?qa=1'
    }
  } catch {
    // ignore
  }
  return '/map'
}

/**
 * Fail-safe local del álbum: figurita ya guardada → UI degradada sin tumbar la app.
 */
export class AlbumScreenErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    capturePipelineError(error, info, {
      boundary: 'AlbumScreenErrorBoundary',
      lastObtenidaFigureId: this.props.lastObtenidaFigureId ?? null,
    })
    albumTrace('album boundary caught render error', {
      message: error?.message,
    })
  }

  handleGoMap = () => {
    window.location.href = mapPathWithQa()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="my-figures-screen safe-top safe-bottom flex h-full flex-col items-center justify-center bg-[#f7f6f3] px-8 text-center">
          <p className="font-display text-xl font-bold text-ink">Tu figurita está guardada</p>
          <p className="mt-3 max-w-sm font-body text-sm leading-relaxed text-muted">
            Hubo un problema al mostrar el álbum. Podés volver al mapa y abrir Mis figuritas de nuevo.
          </p>
          <div className="mt-8 w-full max-w-xs">
            <PremiumButton variant="lime" onClick={this.handleGoMap}>
              Volver al mapa
            </PremiumButton>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
