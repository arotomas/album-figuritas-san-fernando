/** Legacy icon keys — historial anterior al selector removido. */
export const LEGACY_ICON_EMOJI: Record<string, string> = {
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

export const VALID_DESTINATIONS = new Set(['map', 'album', 'home'])

export const DEEP_LINKS: Record<string, string> = {
  map: '/map',
  album: '/my-figures',
  home: '/',
}

export type PushPayloadInput = {
  icon_key?: string
  title: string
  body: string
  destination: string
}

export type PushSubscriptionRow = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  platform?: string | null
  last_seen_at?: string | null
  updated_at?: string | null
}

export function validatePushPayload(input: PushPayloadInput) {
  const rawIconKey = String(input.icon_key ?? '').trim()
  const icon_key = rawIconKey || 'custom'
  const title = String(input.title ?? '').trim()
  const body = String(input.body ?? '').trim()
  const destination = String(input.destination ?? '').trim()

  if (!title || title.length > 120) {
    throw new Error('INVALID_TITLE')
  }
  if (!body || body.length > 500) {
    throw new Error('INVALID_BODY')
  }
  if (!VALID_DESTINATIONS.has(destination)) {
    throw new Error('INVALID_DESTINATION')
  }

  const deep_link = DEEP_LINKS[destination]

  return {
    icon_key,
    title,
    body,
    destination,
    deep_link,
    display_title: title,
  }
}

export function buildWebPushPayload(validated: ReturnType<typeof validatePushPayload>) {
  return JSON.stringify({
    title: validated.display_title,
    body: validated.body,
    icon: '/pwa-192.png',
    badge: '/favicon-48x48.png',
    data: {
      url: validated.deep_link,
      icon_key: validated.icon_key,
      destination: validated.destination,
    },
  })
}

export function computeStatus(successCount: number, failureCount: number) {
  if (successCount > 0 && failureCount === 0) return 'sent'
  if (successCount > 0 && failureCount > 0) return 'partial'
  return 'failed'
}

export function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

export function jsonResponse(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json',
    },
  })
}
