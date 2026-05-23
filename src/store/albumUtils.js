import { ALBUM_STATUS } from '../config/persistence'
import { getMainProgressState } from '../utils/figureGameRules'

export function computeAlbumStatus(figures, lastViewedFigureId = null) {
  const { obtained, total } = getMainProgressState(figures)

  if (total > 0 && obtained >= total) {
    return lastViewedFigureId
      ? ALBUM_STATUS.EN_REVISION
      : ALBUM_STATUS.COMPLETADO
  }

  return ALBUM_STATUS.EN_PROGRESO
}

export function getObtenidasCount(figures) {
  return (Array.isArray(figures) ? figures : []).filter((figure) => figure.obtenida)
    .length
}
