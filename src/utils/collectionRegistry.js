import {
  ALBUM_COLLECTIONS,
  COLLECTION_EDITION,
  COLLECTION_LIST,
  COLLECTION_TRACK,
  COLLECTION_VISIBILITY,
  getCollectionById as getStaticCollectionById,
} from '../config/albumCollections'

let remoteCollections = null
let remoteById = null
let registrySource = 'static'
let registryReason = null

function withCollectionDefaults(collection) {
  if (!collection) return getStaticCollectionById('otros')

  return {
    visibility: COLLECTION_VISIBILITY.PUBLIC,
    edition: COLLECTION_EDITION.STANDARD,
    unlockCondition: null,
    hiddenUntilDiscovered: false,
    coverImage: null,
    eventId: collection.eventId ?? collection.event_id ?? null,
    availableFrom: collection.availableFrom ?? collection.available_from ?? null,
    availableUntil: collection.availableUntil ?? collection.available_until ?? null,
    sortOrder: collection.sortOrder ?? collection.sort_order ?? 100,
    ...collection,
  }
}

export function setRemoteAlbumCollections(collections, { reason = null } = {}) {
  if (!Array.isArray(collections) || collections.length === 0) {
    resetCollectionRegistryToStatic(reason ?? 'empty-remote')
    return
  }

  remoteCollections = collections.map(withCollectionDefaults)
  remoteById = Object.fromEntries(remoteCollections.map((item) => [item.id, item]))
  registrySource = 'remote'
  registryReason = reason

  if (import.meta.env.DEV) {
    console.info('[collection-registry]', 'remote active', {
      count: remoteCollections.length,
      ids: remoteCollections.map((item) => item.id),
    })
  }
}

export function resetCollectionRegistryToStatic(reason = 'reset') {
  remoteCollections = null
  remoteById = null
  registrySource = 'static'
  registryReason = reason
}

export function getCollectionRegistryMeta() {
  return {
    source: registrySource,
    reason: registryReason,
    count: registrySource === 'remote' ? remoteCollections.length : COLLECTION_LIST.length,
  }
}

export function hasRemoteCollections() {
  return registrySource === 'remote' && Boolean(remoteById)
}

export function isKnownCollectionId(collectionId) {
  if (!collectionId) return false
  if (remoteById?.[collectionId]) return true
  return Boolean(ALBUM_COLLECTIONS[collectionId])
}

export function getCollectionById(collectionId) {
  if (remoteById?.[collectionId]) {
    return withCollectionDefaults(remoteById[collectionId])
  }
  return getStaticCollectionById(collectionId)
}

export function getCollectionList({ track = null } = {}) {
  const list =
    registrySource === 'remote' && remoteCollections
      ? [...remoteCollections].sort((a, b) => a.sortOrder - b.sortOrder)
      : COLLECTION_LIST

  if (!track) return list
  return list.filter((collection) => collection.track === track)
}

export function getMainCollectionList() {
  return getCollectionList({ track: COLLECTION_TRACK.MAIN })
}

export function getBonusCollectionList() {
  return getCollectionList({ track: COLLECTION_TRACK.BONUS })
}
