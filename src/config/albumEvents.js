/** Fallback estático — vacío hasta que existan eventos en DB. */

export const ALBUM_EVENTS = {}

export const ALBUM_EVENT_LIST = []

export function getStaticEventById(eventId) {
  if (!eventId) return null
  return ALBUM_EVENTS[eventId] ?? null
}
