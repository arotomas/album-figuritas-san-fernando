/**
 * Flags temporales para aislar qué capa rompe Leaflet en móvil.
 * NO usar en producción — rama diagnostic/map-mobile-isolation.
 *
 * Activación (cualquiera combina):
 * - URL: ?map_debug_log=1&map_debug=leaflet-pure
 * - URL: ?map_debug=disable_rotation,disable_viewport_sync
 * - Consola: __mapDebug.enable('MAP_DEBUG_DISABLE_ROTATION')
 * - sessionStorage clave map_debug_flags (JSON)
 */

export const MAP_DEBUG_FLAG = {
  ROTATION: 'MAP_DEBUG_DISABLE_ROTATION',
  BEARING: 'MAP_DEBUG_DISABLE_BEARING',
  GPU: 'MAP_DEBUG_DISABLE_GPU',
  TRANSITIONS: 'MAP_DEBUG_DISABLE_TRANSITIONS',
  AUTO_FOLLOW: 'MAP_DEBUG_DISABLE_AUTO_FOLLOW',
  VIEWPORT_SYNC: 'MAP_DEBUG_DISABLE_VIEWPORT_SYNC',
  RESIZE_OBSERVER: 'MAP_DEBUG_DISABLE_RESIZE_OBSERVER',
  MARKER_ANIMATIONS: 'MAP_DEBUG_DISABLE_MARKER_ANIMATIONS',
}

const ALL_FLAGS = Object.values(MAP_DEBUG_FLAG)

const DEFAULT_FLAGS = Object.fromEntries(ALL_FLAGS.map((key) => [key, false]))

/** Preset: Leaflet casi puro (todas las capas cinemáticas/layout off). */
const LEAFLET_PURE_FLAGS = Object.fromEntries(ALL_FLAGS.map((key) => [key, true]))

const URL_TOKEN_TO_FLAG = {
  leaflet_pure: '__preset_leaflet_pure__',
  pure: '__preset_leaflet_pure__',
  disable_rotation: MAP_DEBUG_FLAG.ROTATION,
  rotation: MAP_DEBUG_FLAG.ROTATION,
  disable_bearing: MAP_DEBUG_FLAG.BEARING,
  bearing: MAP_DEBUG_FLAG.BEARING,
  disable_gpu: MAP_DEBUG_FLAG.GPU,
  gpu: MAP_DEBUG_FLAG.GPU,
  disable_transitions: MAP_DEBUG_FLAG.TRANSITIONS,
  transitions: MAP_DEBUG_FLAG.TRANSITIONS,
  disable_auto_follow: MAP_DEBUG_FLAG.AUTO_FOLLOW,
  auto_follow: MAP_DEBUG_FLAG.AUTO_FOLLOW,
  disable_viewport_sync: MAP_DEBUG_FLAG.VIEWPORT_SYNC,
  viewport: MAP_DEBUG_FLAG.VIEWPORT_SYNC,
  viewport_sync: MAP_DEBUG_FLAG.VIEWPORT_SYNC,
  disable_resize_observer: MAP_DEBUG_FLAG.RESIZE_OBSERVER,
  resize: MAP_DEBUG_FLAG.RESIZE_OBSERVER,
  resize_observer: MAP_DEBUG_FLAG.RESIZE_OBSERVER,
  disable_marker_animations: MAP_DEBUG_FLAG.MARKER_ANIMATIONS,
  markers: MAP_DEBUG_FLAG.MARKER_ANIMATIONS,
  marker_animations: MAP_DEBUG_FLAG.MARKER_ANIMATIONS,
}

const STORAGE_KEY = 'map_debug_flags'

function readSessionFlags() {
  if (typeof sessionStorage === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed ? parsed : {}
  } catch {
    return {}
  }
}

function writeSessionFlags(flags) {
  if (typeof sessionStorage === 'undefined') return
  try {
    const active = Object.fromEntries(
      Object.entries(flags).filter(([, enabled]) => enabled === true),
    )
    if (Object.keys(active).length === 0) {
      sessionStorage.removeItem(STORAGE_KEY)
      return
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(active))
  } catch {
    // ignore
  }
}

function parseUrlFlagTokens() {
  if (typeof window === 'undefined') return {}

  const params = new URLSearchParams(window.location.search)
  const raw =
    params.get('map_debug') ??
    params.get('mapDebug') ??
    params.get('map_debug_flags') ??
    ''

  if (!raw) return {}

  const next = { ...DEFAULT_FLAGS }
  const tokens = raw.split(/[,+\s|]+/).map((t) => t.trim().toLowerCase()).filter(Boolean)

  for (const token of tokens) {
    const mapped = URL_TOKEN_TO_FLAG[token]
    if (mapped === '__preset_leaflet_pure__') {
      Object.assign(next, LEAFLET_PURE_FLAGS)
      continue
    }
    if (mapped) next[mapped] = true
  }

  return next
}

function mergeFlags(...layers) {
  const merged = { ...DEFAULT_FLAGS }
  for (const layer of layers) {
    for (const key of ALL_FLAGS) {
      if (layer[key] === true) merged[key] = true
    }
  }
  return merged
}

let resolvedFlags = null
let loggingEnabled = null

export function getMapDebugFlags() {
  if (resolvedFlags) return resolvedFlags

  const fromUrl = parseUrlFlagTokens()
  const fromSession = readSessionFlags()
  resolvedFlags = mergeFlags(fromSession, fromUrl)

  if (Object.keys(fromUrl).some((k) => fromUrl[k] === true)) {
    writeSessionFlags(resolvedFlags)
  }

  return resolvedFlags
}

export function isMapDebugFlagEnabled(flagKey) {
  return getMapDebugFlags()[flagKey] === true
}

export function isMapDebugActive() {
  return ALL_FLAGS.some((key) => isMapDebugFlagEnabled(key))
}

export function isMapDebugLoggingEnabled() {
  if (loggingEnabled != null) return loggingEnabled

  if (typeof window === 'undefined') {
    loggingEnabled = import.meta.env.DEV
    return loggingEnabled
  }

  const params = new URLSearchParams(window.location.search)
  loggingEnabled =
    import.meta.env.DEV ||
    params.get('map_debug_log') === '1' ||
    params.get('mapDebugLog') === '1' ||
    isMapDebugActive()

  return loggingEnabled
}

export function resetMapDebugCache() {
  resolvedFlags = null
  loggingEnabled = null
}

export function setMapDebugFlag(flagKey, enabled = true) {
  const flags = { ...getMapDebugFlags(), [flagKey]: Boolean(enabled) }
  resolvedFlags = flags
  writeSessionFlags(flags)
  loggingEnabled = null
  return flags
}

export function clearMapDebugFlags() {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY)
  }
  resetMapDebugCache()
  resolvedFlags = { ...DEFAULT_FLAGS }
  return resolvedFlags
}

export function getActiveMapDebugFlagLabels() {
  return ALL_FLAGS.filter((key) => isMapDebugFlagEnabled(key)).map((key) =>
    key.replace('MAP_DEBUG_DISABLE_', '').toLowerCase(),
  )
}

if (typeof window !== 'undefined') {
  window.__mapDebug = {
    flags: MAP_DEBUG_FLAG,
    get: getMapDebugFlags,
    enable: (key) => setMapDebugFlag(key, true),
    disable: (key) => setMapDebugFlag(key, false),
    clear: clearMapDebugFlags,
    presetLeafletPure: () => {
      resolvedFlags = { ...LEAFLET_PURE_FLAGS }
      writeSessionFlags(resolvedFlags)
      window.location.reload()
    },
    active: getActiveMapDebugFlagLabels,
  }

  if (isMapDebugActive()) {
    console.info('[map-debug] flags activos:', getActiveMapDebugFlagLabels())
  }
}
