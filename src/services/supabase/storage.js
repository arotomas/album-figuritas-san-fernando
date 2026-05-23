import { supabase } from '../../lib/supabase'
import { MAX_PHOTO_BYTES } from '../../config/persistence'
import { supabaseLog } from '../../utils/supabaseLog'

const CAPTURES_BUCKET = 'captures'

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',')
  if (!base64) throw new Error('INVALID_DATA_URL')

  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
  const binary = atob(base64)
  const array = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    array[i] = binary.charCodeAt(i)
  }

  return new Blob([array], { type: mime })
}

/**
 * Sube foto comprimida a captures/{userId}/{timestamp}.jpg
 * @returns URL pública o null si falla
 */
export async function uploadCapturePhoto({ userId, dataUrl, maxBytes = MAX_PHOTO_BYTES }) {
  if (!userId || !dataUrl) {
    supabaseLog.upload.warn('skipped — missing userId or dataUrl')
    return null
  }

  try {
    const blob = dataUrlToBlob(dataUrl)
    if (blob.size > maxBytes) {
      supabaseLog.upload.warn('skipped — file too large', { bytes: blob.size, maxBytes })
      return null
    }

    const timestamp = Date.now()
    const path = `${userId}/${timestamp}.jpg`

    supabaseLog.upload.info('upload start', { path, bytes: blob.size })

    const { error: uploadError } = await supabase.storage
      .from(CAPTURES_BUCKET)
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: false,
        cacheControl: '3600',
      })

    if (uploadError) {
      supabaseLog.upload.warn('upload failed', { message: uploadError.message, path })
      return null
    }

    const { data: publicData } = supabase.storage.from(CAPTURES_BUCKET).getPublicUrl(path)
    const publicUrl = publicData?.publicUrl ?? null

    supabaseLog.upload.info('upload success', { path, publicUrl })
    return publicUrl
  } catch (error) {
    supabaseLog.upload.warn('upload error', { message: error?.message ?? String(error) })
    return null
  }
}
