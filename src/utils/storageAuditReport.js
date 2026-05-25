import { MAX_PHOTO_BYTES, MAX_TOTAL_STORAGE_BYTES, STORAGE_KEY } from '../config/persistence'

function estimateStringBytes(value) {
  if (value == null) return 0
  try {
    return new Blob([String(value)]).size
  } catch {
    return String(value).length
  }
}

function estimatePhotoBytes(photo) {
  if (!photo) return 0
  if (photo.startsWith('data:')) {
    const base64 = photo.split(',')[1] ?? ''
    return Math.round((base64.length * 3) / 4)
  }
  return estimateStringBytes(photo)
}

/** Informe de uso local (prep futura — no migra ni modifica storage). */
export function buildStorageAuditReport(figures = []) {
  const list = Array.isArray(figures) ? figures : []
  const photos = list
    .filter((figure) => figure?.foto)
    .map((figure) => ({
      figureId: figure.id,
      rareza: figure.rareza,
      bytes: estimatePhotoBytes(figure.foto),
      source: figure.foto?.startsWith('data:')
        ? 'local-base64'
        : figure.foto?.startsWith('http')
          ? 'remote-url'
          : 'unknown',
    }))

  const photoBytes = photos.reduce((sum, item) => sum + item.bytes, 0)
  const metadataBytes = estimateStringBytes(
    JSON.stringify(
      list.map((figure) => ({
        id: figure.id,
        obtenida: figure.obtenida,
        rareza: figure.rareza,
        captureMeta: figure.captureMeta ?? null,
      })),
    ),
  )

  let albumPayloadBytes = 0
  let supabaseAuthBytes = 0

  if (typeof window !== 'undefined') {
    albumPayloadBytes = estimateStringBytes(window.localStorage.getItem(STORAGE_KEY))
    const authKey = Object.keys(window.localStorage).find((key) => key.startsWith('sb-') && key.endsWith('-auth-token'))
    if (authKey) {
      supabaseAuthBytes = estimateStringBytes(window.localStorage.getItem(authKey))
    }
  }

  const totalEstimatedBytes = albumPayloadBytes || photoBytes + metadataBytes
  const quotaRisk =
    totalEstimatedBytes > MAX_TOTAL_STORAGE_BYTES * 0.85
      ? 'high'
      : totalEstimatedBytes > MAX_TOTAL_STORAGE_BYTES * 0.6
        ? 'medium'
        : 'low'

  return {
    figureCount: list.length,
    obtainedCount: list.filter((figure) => figure.obtenida).length,
    photosWithBytes: photos,
    photoBytes,
    metadataBytes,
    albumPayloadBytes,
    supabaseAuthBytes,
    totalEstimatedBytes,
    limits: {
      maxPhotoBytes: MAX_PHOTO_BYTES,
      maxAlbumBytes: MAX_TOTAL_STORAGE_BYTES,
    },
    quotaRisk,
    recommendations: [
      'Corto plazo: mantener compresión actual (~350KB/foto) y URLs Supabase cuando existan.',
      'Mediano plazo: metadata en localStorage + blobs en IndexedDB.',
      'Largo plazo: Supabase Storage como source of truth; local solo cache/thumbnail.',
    ],
  }
}

export function logStorageAuditReport(figures) {
  if (!import.meta.env.DEV) return null
  const report = buildStorageAuditReport(figures)
  console.info('[STORAGE_AUDIT]', report)
  return report
}
