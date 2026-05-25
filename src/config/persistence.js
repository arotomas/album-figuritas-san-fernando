export const STORAGE_VERSION = 1

export const STORAGE_KEY = 'figuritas-sf-album'

export const MAX_PHOTO_BYTES = 350_000

export const MAX_TOTAL_STORAGE_BYTES = 4_500_000

export const ALBUM_STATUS = {
  EN_PROGRESO: 'en_progreso',
  COMPLETADO: 'completado',
  EN_REVISION: 'en_revision',
}

export const PERSISTED_FIELDS = [
  'figures',
  'albumStatus',
  'lastObtenidaFigureId',
  'lastViewedFigureId',
  'lastSavedAt',
  'celebratedCollectionIds',
  'discoveredCollectionIds',
  'acknowledgedDiscoveryCollectionIds',
]
