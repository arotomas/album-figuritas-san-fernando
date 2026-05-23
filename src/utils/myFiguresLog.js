const TAG = '[my-figures]'

function emit(level, message, detail) {
  if (detail !== undefined) {
    if (level === 'warn') console.warn(TAG, message, detail)
    else console.info(TAG, message, detail)
  } else if (level === 'warn') {
    console.warn(TAG, message)
  } else {
    console.info(TAG, message)
  }
}

export const myFiguresLog = {
  info: (message, detail) => emit('info', message, detail),
  warn: (message, detail) => emit('warn', message, detail),
}

export function isValidAlbumFigure(figure) {
  return (
    figure != null &&
    typeof figure === 'object' &&
    figure.id != null &&
    typeof figure.nombre === 'string' &&
    figure.nombre.length > 0
  )
}

export function sanitizeAlbumFigures(figures) {
  if (!Array.isArray(figures)) return []

  return figures.filter((figure) => {
    if (isValidAlbumFigure(figure)) return true
    myFiguresLog.warn('render guard — invalid figure skipped', {
      figureId: figure?.id ?? null,
      hasNombre: Boolean(figure?.nombre),
    })
    return false
  })
}

export function resolveActiveFigureId(preferredId, figures) {
  if (preferredId == null || figures.length === 0) {
    return figures[0]?.id ?? null
  }

  const match = figures.find(
    (figure) => figure.id === preferredId || String(figure.id) === String(preferredId),
  )

  if (match) return match.id

  myFiguresLog.warn('render guard — preferred figure id not in catalog', {
    preferredId,
    fallbackId: figures[0]?.id ?? null,
  })

  return figures[0]?.id ?? null
}

export function resolveActiveFigure(activeId, figures) {
  if (activeId == null || figures.length === 0) return null

  const match = figures.find(
    (figure) => figure.id === activeId || String(figure.id) === String(activeId),
  )

  return match ?? figures[0] ?? null
}
