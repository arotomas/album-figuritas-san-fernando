const STORAGE_KEY = 'figuritas-last-known-pos'

export function loadLastKnownPosition() {
  if (typeof sessionStorage === 'undefined') return null

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.lat == null || parsed?.lng == null) return null
    return parsed
  } catch {
    return null
  }
}

export function saveLastKnownPosition(position) {
  if (typeof sessionStorage === 'undefined' || !position) return

  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        lat: position.lat,
        lng: position.lng,
        accuracy: position.accuracy,
        timestamp: position.timestamp ?? Date.now(),
      }),
    )
  } catch {
    // quota / private mode
  }
}
