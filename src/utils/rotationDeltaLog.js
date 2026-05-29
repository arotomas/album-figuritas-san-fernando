/**
 * Traza cambios de rotación con valor anterior/nuevo, motivo y timestamp.
 * Filtrar consola remota: [ROTATION_DELTA]
 */

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
  console.info('[ROTATION_DELTA]', {
    iso: new Date().toISOString(),
    t: Math.round(performance.now()),
    file,
    fn,
    line,
    field,
    reason,
    prev,
    next,
    ...(meta != null ? { meta } : {}),
  })
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
