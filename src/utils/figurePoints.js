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

const POINTS_BURST_DURATION_MS = {
  común: 3000,
  rara: 3100,
  épica: 3200,
  legendaria: 3350,
  bonus: 3500,
}

export function getPointsBurstDurationMs(figure, { reduced = false } = {}) {
  if (reduced) return 2800
  const tier = getPointsBurstTier(figure)
  return POINTS_BURST_DURATION_MS[tier] ?? 3000
}
