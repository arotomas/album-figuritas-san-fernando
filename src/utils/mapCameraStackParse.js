const SKIP_SUBSTRINGS = [
  'mapCameraInstrumentation',
  'mapCameraWrapped',
  'node_modules',
  'leaflet/dist',
  'react-leaflet',
  'chunk-vendors',
]

/** Símbolos de app conocidos que invocan métodos de cámara. */
const APP_FUNCTION_SYMBOLS = [
  'MapFlyController',
  'handleRecenter',
  'handleConfirmTarget',
  'fitBoundsBetweenUserAndTarget',
  'flyToExplorationTarget',
  'runExplorationCamera',
  'MapRecenter',
  'LeafletMapViewInner',
]

/** Fragmento del bundle/chunk → ruta lógica en src/. */
const APP_FILE_HINTS = [
  ['LeafletMapView', 'components/map/LeafletMapView.jsx'],
  ['explorationMap', 'utils/explorationMap.js'],
  ['AdminFigureLocationPicker', 'components/admin/AdminFigureLocationPicker.jsx'],
]

function shouldSkipLine(line) {
  return SKIP_SUBSTRINGS.some((part) => line.includes(part))
}

function lineNumberFromUrl(urlPart) {
  const match = urlPart.match(/:(\d+)(?::\d+)?$/)
  return match ? Number(match[1]) : null
}

function fileFromUrl(urlPart) {
  const srcMatch = urlPart.match(/\/src\/(.+?)(?::\d+)?(?::\d+)?$/)
  if (srcMatch) return srcMatch[1]

  for (const [hint, logicalPath] of APP_FILE_HINTS) {
    if (urlPart.includes(hint)) return logicalPath
  }

  const baseMatch = urlPart.match(/\/([^/?#]+\.(?:jsx|js))(?::\d+)?(?::\d+)?$/)
  return baseMatch ? baseMatch[1] : urlPart.split('/').pop()?.split(':')[0] ?? 'unknown'
}

function parseStackLine(line) {
  const chrome = line.match(/^at\s+(?:async\s+)?([^\s(]+)\s+\((.+)\)$/)
  if (chrome) {
    const fn = chrome[1]
    const urlPart = chrome[2]
    return {
      fn,
      file: fileFromUrl(urlPart),
      line: lineNumberFromUrl(urlPart),
      raw: line,
    }
  }

  const safari = line.match(/^([^@]+)@(.+)$/)
  if (safari) {
    const fn = safari[1]
    const urlPart = safari[2]
    return {
      fn,
      file: fileFromUrl(urlPart),
      line: lineNumberFromUrl(urlPart),
      raw: line,
    }
  }

  return null
}

function formatStackSummary({ fn, file, line }) {
  const lineSuffix = line != null ? `:${line}` : ''
  return `${fn} @ ${file}${lineSuffix}`
}

/**
 * Resuelve el primer frame de aplicación responsable de un api-call.
 * Prioridad: /src/ → símbolo conocido → primer frame no interno.
 */
export function parseMapCameraStackOrigin(stack) {
  const unknown = {
    originFile: 'unknown',
    originFn: 'unknown',
    stackSummary: 'unknown',
    rawFrame: null,
  }

  if (!stack) return unknown

  const lines = stack
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  for (const line of lines) {
    if (shouldSkipLine(line)) continue
    if (!line.includes('/src/')) continue

    const parsed = parseStackLine(line)
    if (!parsed) continue

    return {
      originFile: parsed.file,
      originFn: parsed.fn,
      stackSummary: formatStackSummary(parsed),
      rawFrame: parsed.raw,
    }
  }

  for (const symbol of APP_FUNCTION_SYMBOLS) {
    for (const line of lines) {
      if (shouldSkipLine(line)) continue
      if (!line.includes(symbol)) continue

      const parsed = parseStackLine(line)
      if (parsed) {
        return {
          originFile: parsed.file,
          originFn: symbol,
          stackSummary: formatStackSummary({ ...parsed, fn: symbol }),
          rawFrame: parsed.raw,
        }
      }

      return {
        originFile: 'unknown',
        originFn: symbol,
        stackSummary: symbol,
        rawFrame: line,
      }
    }
  }

  for (const line of lines) {
    if (shouldSkipLine(line)) continue

    const parsed = parseStackLine(line)
    if (!parsed) continue

    return {
      originFile: parsed.file,
      originFn: parsed.fn,
      stackSummary: formatStackSummary(parsed),
      rawFrame: parsed.raw,
    }
  }

  return unknown
}

export function siteKeyFromParsedOrigin(origin) {
  if (!origin) return 'unknown'
  return `${origin.originFn} @ ${origin.originFile}`
}
