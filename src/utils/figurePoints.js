import { QA_TEST_FIGURE_ID_PREFIX } from '../config/qaConstants'
import { getRarity } from '../theme/rarity'

/** Espejo de public.resolve_figure_points() — solo label UI / optimismo. */
export function resolveFigurePointsFromCatalog(figure) {
  if (!figure) return 0

  if (figure.is_bonus) return 150

  const rarityKey = normalizeRarityKey(figure.rareza ?? figure.rarity)

  if (rarityKey === 'legendaria' || rarityKey === 'legendary') return 100
  if (rarityKey === 'épica' || rarityKey === 'epica' || rarityKey === 'epic') return 50
  if (rarityKey === 'rara') return 25

  return 10
}

function normalizeRarityKey(value) {
  return String(value ?? 'común').trim().toLowerCase()
}

export function getPointsBurstTier(figure) {
  if (!figure) return 'común'
  if (figure.is_bonus) return 'bonus'

  const rarity = getRarity(figure.rareza ?? figure.rarity ?? 'común')
  return rarity.id
}

export function shouldShowPointsBurst(figure) {
  if (!figure || figure.isQaTest) return false

  const figureId = String(figure.id ?? '')
  if (
    figureId.startsWith(QA_TEST_FIGURE_ID_PREFIX) ||
    figureId.startsWith('dev-')
  ) {
    return false
  }

  return resolveFigurePointsFromCatalog(figure) > 0
}
