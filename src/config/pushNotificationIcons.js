export const PUSH_NOTIFICATION_ICONS = [
  { key: 'event', emoji: '🎉', label: 'Evento' },
  { key: 'highlight', emoji: '⭐', label: 'Destacado' },
  { key: 'location', emoji: '📍', label: 'Ubicación' },
  { key: 'nature', emoji: '🏞️', label: 'Naturaleza' },
  { key: 'sports', emoji: '⚽', label: 'Deportes' },
  { key: 'culture', emoji: '🎭', label: 'Cultura' },
  { key: 'achievement', emoji: '🏆', label: 'Logro' },
  { key: 'prize', emoji: '🎁', label: 'Premio' },
  { key: 'activity', emoji: '🚴', label: 'Actividad' },
  { key: 'important', emoji: '🚨', label: 'Importante' },
]

export const PUSH_DESTINATIONS = [
  { key: 'map', label: 'Mapa' },
  { key: 'album', label: 'Álbum' },
  { key: 'home', label: 'Inicio' },
]

const ICON_BY_KEY = Object.fromEntries(
  PUSH_NOTIFICATION_ICONS.map((item) => [item.key, item]),
)

export function getPushIconByKey(iconKey) {
  return ICON_BY_KEY[iconKey] ?? PUSH_NOTIFICATION_ICONS[0]
}

/** Solo para preview / payload visual — no muta el título del formulario. */
export function composePushDisplayTitle(iconKey, title) {
  const trimmed = String(title ?? '').trim()
  const emoji = getPushIconByKey(iconKey).emoji
  if (!trimmed) return emoji
  return `${emoji} ${trimmed}`
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
