export const PUSH_DESTINATIONS = [
  { key: 'map', label: 'Mapa' },
  { key: 'album', label: 'Álbum' },
  { key: 'home', label: 'Inicio' },
]

/** Legacy catalog — solo para historial creado antes de quitar el selector de iconos. */
const LEGACY_ICON_EMOJI = {
  event: '🎉',
  highlight: '⭐',
  location: '📍',
  nature: '🏞️',
  sports: '⚽',
  culture: '🎭',
  achievement: '🏆',
  prize: '🎁',
  activity: '🚴',
  important: '🚨',
}

export function formatPushHistoryTitle(item) {
  const title = String(item?.title ?? '').trim()
  const iconKey = String(item?.icon_key ?? '').trim()
  const legacyEmoji = LEGACY_ICON_EMOJI[iconKey]
  if (legacyEmoji && iconKey !== 'custom') {
    return `${legacyEmoji} ${title}`
  }
  return title
}

export function getDestinationLabel(destinationKey) {
  return PUSH_DESTINATIONS.find((item) => item.key === destinationKey)?.label ?? destinationKey
}

export const PUSH_STATUS_LABELS = {
  sent: { label: 'Enviado', tone: 'success' },
  partial: { label: 'Parcial', tone: 'warning' },
  failed: { label: 'Error', tone: 'error' },
}

export function formatPushStatus(status) {
  return PUSH_STATUS_LABELS[status] ?? { label: status, tone: 'error' }
}
