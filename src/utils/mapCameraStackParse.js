const SKIP_SUBSTRINGS = [
  'mapCameraInstrumentation',
  'mapCameraWrapped',
  'node_modules',
  'leaflet/dist',
  'react-leaflet',
  'chunk-vendors',
]

/** Orden de prioridad para resolvedFunction. */
export const RESOLVED_CAMERA_CALLERS = [
  'MapFlyController',
  'handleRecenter',
  'handleConfirmTarget',
  'flyToExplorationTarget',
  'runExplorationCamera',
  'fitBoundsBetweenUserAndTarget',
]

const APP_FUNCTION_SYMBOLS = [
  ...RESOLVED_CAMERA_CALLERS,
  'MapRecenter',
  'LeafletMapViewInner',
]

const RESOLVED_FILE_BY_SYMBOL = {
  MapFlyController: 'components/map/LeafletMapView.jsx',
  handleRecenter: 'components/map/LeafletMapView.jsx',
  handleConfirmTarget: 'components/map/LeafletMapView.jsx',
  LeafletMapViewInner: 'components/map/LeafletMapView.jsx',
  fitBoundsBetweenUserAndTarget: 'utils/explorationMap.js',
  flyToExplorationTarget: 'utils/explorationMap.js',
  runExplorationCamera: 'utils/explorationMap.js',
  MapRecenter: 'components/admin/AdminFigureLocationPicker.jsx',
}

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

function findResolvedFunction(stack) {
  for (const symbol of RESOLVED_CAMERA_CALLERS) {
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

function formatCaller(frame) {
  if (!frame) return 'unknown'
  const lineSuffix = frame.line != null ? `:${frame.line}` : ''
  return `${frame.fn} @ ${frame.file}${lineSuffix}`
}

export function parseMapCameraStackOrigin(stack) {
  const unknown = {
    originFile: 'unknown',
    originFn: 'unknown',
    stackSummary: 'unknown',
    rawFrame: null,
    bundleFn: null,
    caller: 'unknown',
    resolvedFunction: 'unknown',
    resolvedFile: 'unknown',
  }

  if (!stack) return unknown

  const lines = stack
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const resolvedFunction = findResolvedFunction(stack)
  const srcFrame = findSrcFrame(lines)
  const appFrame = findBestAppFrame(lines)
  const callerFrame = appFrame ?? findAnyFrame(lines)

  const resolvedFile =
    (resolvedFunction && RESOLVED_FILE_BY_SYMBOL[resolvedFunction]) ||
    srcFrame?.file ||
    appFrame?.file ||
    callerFrame?.file ||
    'unknown'

  const caller = formatCaller(callerFrame)

  if (srcFrame) {
    const fn = resolvedFunction ?? srcFrame.fn
    return {
      originFile: srcFrame.file,
      originFn: fn,
      stackSummary: formatStackSummary({
        fn,
        file: srcFrame.file,
        line: srcFrame.line,
        bundleFn: resolvedFunction && resolvedFunction !== srcFrame.fn ? srcFrame.fn : null,
      }),
      rawFrame: srcFrame.raw,
      bundleFn: srcFrame.fn,
      caller,
      resolvedFunction: resolvedFunction ?? fn,
      resolvedFile,
    }
  }

  const frame = appFrame ?? callerFrame
  if (frame) {
    let fn = frame.fn
    if (resolvedFunction) {
      fn = resolvedFunction
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
      caller,
      resolvedFunction: resolvedFunction ?? fn,
      resolvedFile,
    }
  }

  if (resolvedFunction) {
    return {
      originFile: resolvedFile,
      originFn: resolvedFunction,
      stackSummary: resolvedFunction,
      rawFrame: null,
      bundleFn: null,
      caller,
      resolvedFunction,
      resolvedFile,
    }
  }

  return unknown
}

export function siteKeyFromParsedOrigin(origin) {
  if (!origin) return 'unknown'
  return `${origin.resolvedFunction ?? origin.originFn} @ ${origin.resolvedFile ?? origin.originFile}`
}
