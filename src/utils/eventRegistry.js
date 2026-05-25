import {
  ALBUM_EVENT_LIST,
  ALBUM_EVENTS,
  getStaticEventById,
} from '../config/albumEvents'
import { EVENT_LIFECYCLE, resolveEventLifecycle } from './eventLifecycle'

let remoteEvents = null
let remoteById = null
let registrySource = 'static'
let registryReason = null

function withEventDefaults(event) {
  if (!event) return null

  return {
    active: true,
    coverImage: null,
    badge: null,
    ambience: null,
    startsAt: event.startsAt ?? event.starts_at ?? null,
    endsAt: event.endsAt ?? event.ends_at ?? null,
    ...event,
  }
}

export function setRemoteAlbumEvents(events, { reason = null } = {}) {
  if (!Array.isArray(events) || events.length === 0) {
    resetEventRegistryToStatic(reason ?? 'empty-remote')
    return
  }

  remoteEvents = events.map(withEventDefaults)
  remoteById = Object.fromEntries(remoteEvents.map((item) => [item.id, item]))
  registrySource = 'remote'
  registryReason = reason

  if (import.meta.env.DEV) {
    console.info('[event-registry]', 'remote active', {
      count: remoteEvents.length,
      ids: remoteEvents.map((item) => item.id),
    })
  }
}

export function resetEventRegistryToStatic(reason = 'reset') {
  remoteEvents = null
  remoteById = null
  registrySource = 'static'
  registryReason = reason
}

export function getEventRegistryMeta() {
  return {
    source: registrySource,
    reason: registryReason,
    count: registrySource === 'remote' ? remoteEvents.length : ALBUM_EVENT_LIST.length,
  }
}

export function hasRemoteEvents() {
  return registrySource === 'remote' && Boolean(remoteById)
}

export function isKnownEventId(eventId) {
  if (!eventId) return false
  if (remoteById?.[eventId]) return true
  return Boolean(ALBUM_EVENTS[eventId])
}

export function getEventById(eventId) {
  if (!eventId) return null
  if (remoteById?.[eventId]) {
    return withEventDefaults(remoteById[eventId])
  }
  return getStaticEventById(eventId)
}

export function getEventList() {
  if (registrySource === 'remote' && remoteEvents) {
    return [...remoteEvents]
  }
  return ALBUM_EVENT_LIST
}

export function getActiveEventIds(now = Date.now()) {
  return getEventList()
    .filter((event) => resolveEventLifecycle(event, now) === EVENT_LIFECYCLE.ACTIVE)
    .map((event) => String(event.id))
}

export function getActiveEventIdSet(now = Date.now()) {
  return new Set(getActiveEventIds(now))
}
