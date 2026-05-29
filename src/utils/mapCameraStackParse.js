const SKIP_SUBSTRINGS = [
  'mapCameraInstrumentation',
  'mapCameraWrapped',
  'node_modules',
  'leaflet/dist',
  'react-leaflet',
  'chunk-vendors',
]

/** Símbolos de app que invocan métodos de cámara (buscar en stack completo). */
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

/** Fragmento del chunk → ruta lógica en src/. */
const APP_FILE_HINTS = [
  ['LeafletMapView', 'components/map/LeafletMapView.jsx'],
  ['explorationMap', 'utils/explorationMap.js'],
  ['AdminFigureLocationPicker', 'components/admin/AdminFigureLocationPicker.jsx'],
]

function shouldSkipLine(line) {
  return SKIP_SUBSTRINGS.some((part) => line.includes(part))
}

function isMinifiedFnName(name) {
  if (!name || name === 'unknown') return true
  if (name.length <= 2) return true
  if (/^Object\./.test(name)) return true
  if (name === 'anonymous' || name === '<anonymous>') return true
  return false
}

function findSymbolInStack(stack) {
  for (const symbol of APP_FUNCTION_SYMBOLS) {
    if (stack.includes(symbol)) return symbol
  }
  return null
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

function isAppChunkLine(line, parsed) {
  if (!parsed) return false
  if (APP_FILE_HINTS.some(([hint]) => parsed.file.includes(hint) || line.includes(hint))) {
    return true
  }
  return parsed.file.includes('/src/')
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
      raw: line.trim(),
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
      raw: line.trim(),
    }
  }

  return null
}

function formatStackSummary({ fn, file, line, bundleFn }) {
  const lineSuffix = line != null ? `:${line}` : ''
  if (bundleFn && bundleFn !== fn) {
    return `${fn} @ ${file}${lineSuffix} (bundle:${bundleFn})`
  }
  return `${fn} @ ${file}${lineSuffix}`
}

function findBestAppFrame(lines) {
  for (const line of lines) {
    if (shouldSkipLine(line)) continue
    const parsed = parseStackLine(line)
    if (!parsed || !isAppChunkLine(line, parsed)) continue
    return parsed
  }
  return null
}

function findSrcFrame(lines) {
  for (const line of lines) {
    if (shouldSkipLine(line)) continue
    if (!line.includes('/src/')) continue
    const parsed = parseStackLine(line)
    if (parsed) return parsed
  }
  return null
}

function findAnyFrame(lines) {
  for (const line of lines) {
    if (shouldSkipLine(line)) continue
    const parsed = parseStackLine(line)
    if (parsed) return parsed
  }
  return null
}

/**
 * Resuelve origen del api-call en dev (/src/) y prod (chunk + símbolos conocidos).
 */
export function parseMapCameraStackOrigin(stack) {
  const unknown = {
    originFile: 'unknown',
    originFn: 'unknown',
    stackSummary: 'unknown',
    rawFrame: null,
    bundleFn: null,
  }

  if (!stack) return unknown

  const lines = stack
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const symbol = findSymbolInStack(stack)
  const srcFrame = findSrcFrame(lines)
  const appFrame = findBestAppFrame(lines)
  const anyFrame = findAnyFrame(lines)

  if (srcFrame) {
    const fn = symbol && symbol !== srcFrame.fn ? symbol : srcFrame.fn
    return {
      originFile: srcFrame.file,
      originFn: fn,
      stackSummary: formatStackSummary({
        fn,
        file: srcFrame.file,
        line: srcFrame.line,
        bundleFn: symbol && symbol !== srcFrame.fn ? srcFrame.fn : null,
      }),
      rawFrame: srcFrame.raw,
      bundleFn: srcFrame.fn,
    }
  }

  const frame = appFrame ?? anyFrame
  if (frame) {
    let fn = frame.fn
    if (symbol) {
      fn = symbol
    } else if (isMinifiedFnName(fn) && frame.line != null) {
      fn = `${frame.file.split('/').pop() ?? 'bundle'}@L${frame.line}`
    }

    return {
      originFile: frame.file,
      originFn: fn,
      stackSummary: formatStackSummary({
        fn,
        file: frame.file,
        line: frame.line,
        bundleFn: frame.fn !== fn ? frame.fn : null,
      }),
      rawFrame: frame.raw,
      bundleFn: frame.fn,
    }
  }

  if (symbol) {
    return {
      originFile: 'unknown',
      originFn: symbol,
      stackSummary: symbol,
      rawFrame: null,
      bundleFn: null,
    }
  }

  return unknown
}

export function siteKeyFromParsedOrigin(origin) {
  if (!origin) return 'unknown'
  return `${origin.originFn} @ ${origin.originFile}`
}
