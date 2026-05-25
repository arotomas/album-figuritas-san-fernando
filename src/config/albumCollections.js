/** Catálogo de colecciones del álbum — source of truth visual/UX. */

export const COLLECTION_TRACK = {
  MAIN: 'main',
  BONUS: 'bonus',
  EVENT: 'event',
}

export const COLLECTION_STATUS = {
  INCOMPLETE: 'incomplete',
  ALMOST_COMPLETE: 'almost_complete',
  COMPLETED: 'completed',
}

export const ALBUM_COLLECTIONS = {
  plazas: {
    id: 'plazas',
    label: 'Plazas',
    description: 'Espacios verdes y encuentros al aire libre.',
    icon: '🌳',
    page: 1,
    sortOrder: 1,
    track: COLLECTION_TRACK.MAIN,
  },
  murales: {
    id: 'murales',
    label: 'Murales',
    description: 'Arte urbano y color en las calles.',
    icon: '🎨',
    page: 1,
    sortOrder: 2,
    track: COLLECTION_TRACK.MAIN,
  },
  cultura: {
    id: 'cultura',
    label: 'Cultura',
    description: 'Historia, museos y patrimonio local.',
    icon: '🏛️',
    page: 2,
    sortOrder: 3,
    track: COLLECTION_TRACK.MAIN,
  },
  arquitectura: {
    id: 'arquitectura',
    label: 'Arquitectura',
    description: 'Edificios emblemáticos de San Fernando.',
    icon: '🏗️',
    page: 2,
    sortOrder: 4,
    track: COLLECTION_TRACK.MAIN,
  },
  deportes: {
    id: 'deportes',
    label: 'Deportes',
    description: 'Clubes, canchas y tradición deportiva.',
    icon: '⚽',
    page: 3,
    sortOrder: 5,
    track: COLLECTION_TRACK.MAIN,
  },
  personajes: {
    id: 'personajes',
    label: 'Personajes',
    description: 'Figuras que marcaron la ciudad.',
    icon: '⭐',
    page: 3,
    sortOrder: 6,
    track: COLLECTION_TRACK.MAIN,
  },
  secretos: {
    id: 'secretos',
    label: 'Secretos',
    description: 'Figuritas especiales escondidas en la ciudad.',
    icon: '✦',
    page: 4,
    sortOrder: 90,
    track: COLLECTION_TRACK.BONUS,
    hiddenUntilDiscovered: true,
  },
  otros: {
    id: 'otros',
    label: 'Otros',
    description: 'Lugares por descubrir.',
    icon: '📍',
    page: 99,
    sortOrder: 100,
    track: COLLECTION_TRACK.MAIN,
  },
}

export const COLLECTION_LIST = Object.values(ALBUM_COLLECTIONS).sort(
  (a, b) => a.sortOrder - b.sortOrder,
)

export const MAIN_COLLECTIONS = COLLECTION_LIST.filter(
  (collection) => collection.track === COLLECTION_TRACK.MAIN,
)

export function getCollectionById(collectionId) {
  if (!collectionId) return ALBUM_COLLECTIONS.otros
  return ALBUM_COLLECTIONS[collectionId] ?? ALBUM_COLLECTIONS.otros
}

/** Fallback client-side cuando la DB aún no tiene collection_id. */
export const FIGURE_COLLECTION_OVERRIDES = {
  catedral: 'arquitectura',
  plaza: 'plazas',
  costanera: 'plazas',
  museo: 'cultura',
  estacion: 'arquitectura',
}
