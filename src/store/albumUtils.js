import { ALBUM_STATUS } from '../config/persistence'
import { TOTAL_FIGURES } from '../data/mockFigures'

export function computeAlbumStatus(figures, lastViewedFigureId = null) {
  const obtenidas = figures.filter((figure) => figure.obtenida).length

  if (obtenidas >= TOTAL_FIGURES) {
    return lastViewedFigureId
      ? ALBUM_STATUS.EN_REVISION
      : ALBUM_STATUS.COMPLETADO
  }

  return ALBUM_STATUS.EN_PROGRESO
}

export function getObtenidasCount(figures) {
  return figures.filter((figure) => figure.obtenida).length
}
