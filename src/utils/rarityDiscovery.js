import { RARITY_DISCOVERY_BEAT_MS } from '../config/captureFeel'
import { getRarity } from '../theme/rarity'

const DISCOVERY_COPY = {
  rara: {
    headline: 'Descubriste una figurita rara',
    subline: 'Un hallazgo especial en tu camino',
  },
  épica: {
    headline: 'Hallazgo épico',
    subline: 'Figurita épica descubierta',
  },
  legendaria: {
    headline: 'Figurita legendaria encontrada',
    subline: 'Un hallazgo único en San Fernando',
  },
}

export function isSpecialRarityDiscovery(rareza) {
  return getRarity(rareza).tier >= 2
}

export function getRarityDiscoveryBeatMs(rareza, { reduced = false } = {}) {
  const rarity = getRarity(rareza)
  if (rarity.tier < 2) return 0
  const table = reduced ? RARITY_DISCOVERY_BEAT_MS.reduced : RARITY_DISCOVERY_BEAT_MS.full
  return table[rarity.id] ?? table.rara
}

export function getRarityDiscoveryContent(figure) {
  const rarity = getRarity(figure?.rareza ?? figure?.rarity)
  if (rarity.tier < 2) return null

  const base = DISCOVERY_COPY[rarity.id] ?? DISCOVERY_COPY.rara
  const subline = figure?.is_bonus
    ? `${base.subline} · Colección bonus`
    : base.subline

  return {
    rarity,
    headline: base.headline,
    subline,
    reassurance: 'Ya quedó guardada en tu álbum',
  }
}
