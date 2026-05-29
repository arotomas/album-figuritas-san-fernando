/**
 * Traza cambios de rotación con valor anterior/nuevo, motivo y timestamp.
 * Filtrar consola remota: [ROTATION_DELTA]
 */

import { pushMapDiagnosticEvent } from './mapDiagnosticFeed'

export function logRotationDelta({
  file,
  fn,
  line,
  field,
  reason,
  prev,
  next,
  meta,
}) {
  const row = {
    iso: new Date().toISOString(),
    t: Math.round(performance.now()),
    source: 'ROTATION_DELTA',
    file,
    fn,
    line,
    field,
    reason,
    prev,
    next,
    ...(meta != null ? { meta } : {}),
  }
  console.info('[ROTATION_DELTA]', row)
  pushMapDiagnosticEvent(row)
}

export function readPaneRotation(pane) {
  if (!pane?.style) {
    return { transformOrigin: null, transform: null }
  }
  return {
    transformOrigin: pane.style.transformOrigin || null,
    transform: pane.style.transform || null,
  }
}
