import { isQaShellActive } from '../../qa/qaCore'
import { useQaPanelVisibility } from '../../qa/useQaCore'
import { GpsDiagnosticPanel } from '../map/GpsDiagnosticPanel'
import { QaLocationPanel } from './QaLocationPanel'

/**
 * Montaje unificado de paneles QA en el mapa.
 * Visibilidad controlada por qaCore (URL params + runtime toggles).
 */
export function MapQaOverlay({
  geolocationAvailable,
  permission,
  trustedPosition,
  onRequestSingleFix,
  onRetryPrecise,
  onStartTracking,
  onStopTracking,
  onRecenter,
  hasMapPosition,
  proximityNearest,
  rawNearest,
  isNearFigure,
  nearFigure,
  mapPosition,
  isWatching,
  figures,
}) {
  const { gps: showGps, location: showLocation } = useQaPanelVisibility()

  if (!isQaShellActive()) return null
  if (!showGps && !showLocation) return null

  return (
    <>
      {showGps && (
        <GpsDiagnosticPanel
          geolocationAvailable={geolocationAvailable}
          permission={permission}
          trustedPosition={trustedPosition}
          onRequestSingleFix={onRequestSingleFix}
          onRetryPrecise={onRetryPrecise}
          onStartTracking={onStartTracking}
          onStopTracking={onStopTracking}
          onRecenter={onRecenter}
          hasMapPosition={hasMapPosition}
          proximityNearest={proximityNearest}
          rawNearest={rawNearest}
          isNearFigure={isNearFigure}
          nearFigure={nearFigure}
        />
      )}

      {showLocation && (
        <QaLocationPanel
          mapPosition={mapPosition}
          isWatching={isWatching}
          figureCount={figures.length}
          nearFigure={nearFigure}
          figures={figures}
        />
      )}
    </>
  )
}
