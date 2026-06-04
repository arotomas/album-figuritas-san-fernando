export const QA_TEST_FIGURE_ID_PREFIX = 'qa-'

/** QA efímero del mapa (?qa=1), ids tipo qa-42 — no es catálogo remoto. */
export function isEphemeralQaFigureId(figureId) {
  return /^qa-\d+$/.test(String(figureId ?? ''))
}

/** Figurita de catálogo staging con prefijo qa- (ej. qa-costanera-01). */
export function isQaCatalogFigureId(figureId) {
  const key = String(figureId ?? '')
  return (
    (key.startsWith(QA_TEST_FIGURE_ID_PREFIX) || key.startsWith('dev-')) &&
    !isEphemeralQaFigureId(key)
  )
}
