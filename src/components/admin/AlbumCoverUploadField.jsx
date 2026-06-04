import { useCallback, useRef, useState } from 'react'
import {
  ALBUM_COVER_MIME_TYPES,
  deleteAlbumCoverStorage,
  uploadAlbumCover,
} from '../../services/supabase/storage'

function getUploadErrorMessage(result) {
  switch (result.reason) {
    case 'INVALID_MIME':
      return 'Formato no válido. Usá PNG, WebP o JPEG.'
    case 'FILE_TOO_LARGE':
    case 'FILE_TOO_LARGE_SOURCE':
      return 'La imagen es demasiado pesada. Probá con otra más chica.'
    case 'MISSING_ALBUM_ID':
      return 'Completá el ID del álbum antes de subir la portada.'
    default:
      return result.reason ?? 'No pudimos subir la portada.'
  }
}

export function AlbumCoverUploadField({
  albumId,
  coverUrl,
  onCoverChange,
  onUploadError,
  disabled = false,
}) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [localPreview, setLocalPreview] = useState(null)

  const previewUrl = localPreview ?? coverUrl ?? null
  const canUpload = Boolean(albumId?.trim()) && !disabled && !uploading

  const handleFile = useCallback(
    async (file) => {
      if (!file || !canUpload) return

      setUploading(true)
      setLocalPreview(URL.createObjectURL(file))
      onUploadError?.(null)

      try {
        const result = await uploadAlbumCover({ albumId: albumId.trim(), file })
        if (!result.ok) {
          setLocalPreview(null)
          onUploadError?.(getUploadErrorMessage(result))
          return
        }

        onCoverChange(result.publicUrl)
        setLocalPreview(null)
      } catch (error) {
        setLocalPreview(null)
        onUploadError?.(error?.message ?? 'No pudimos subir la portada.')
      } finally {
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [albumId, canUpload, onCoverChange, onUploadError],
  )

  const handleInputChange = (event) => {
    const file = event.target.files?.[0]
    void handleFile(file)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragActive(false)
    if (!canUpload) return
    const file = event.dataTransfer.files?.[0]
    void handleFile(file)
  }

  const handleRemove = async () => {
    if (disabled || uploading) return

    setUploading(true)
    onUploadError?.(null)
    try {
      if (coverUrl) {
        await deleteAlbumCoverStorage({ albumId: albumId?.trim(), publicUrl: coverUrl })
      }
      onCoverChange('')
      setLocalPreview(null)
    } catch (error) {
      onUploadError?.(error?.message ?? 'No pudimos quitar la portada.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="md:col-span-2">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">Portada del álbum</p>

      <div className="mt-2 flex flex-col gap-4 sm:flex-row">
        <div className="w-full max-w-[11rem] shrink-0 overflow-hidden rounded-xl border border-border/70 bg-slate-50">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Portada del álbum"
              className="aspect-[4/5] h-full w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[4/5] min-h-[8.5rem] flex-col items-center justify-center px-3 text-center">
              <span className="text-2xl opacity-40">🖼️</span>
              <p className="mt-2 font-body text-[11px] leading-snug text-muted">
                Sin portada
              </p>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div
            onDragEnter={() => canUpload && setDragActive(true)}
            onDragOver={(event) => {
              event.preventDefault()
              if (canUpload) setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`rounded-xl border border-dashed px-4 py-5 transition-colors ${
              dragActive
                ? 'border-progress bg-progress/5'
                : 'border-border bg-white'
            } ${!canUpload ? 'opacity-60' : ''}`}
          >
            <p className="text-sm font-semibold text-ink">
              {uploading ? 'Subiendo portada…' : 'Arrastrá una imagen o elegila desde tu dispositivo'}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              PNG, WebP o JPEG. Se optimiza automáticamente (máx. ~200 KB).
            </p>

            {!albumId?.trim() && (
              <p className="mt-2 text-xs font-semibold text-amber-800">
                Completá el ID del álbum para habilitar la subida.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!canUpload}
                onClick={() => inputRef.current?.click()}
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {uploading ? 'Subiendo…' : 'Subir portada'}
              </button>
              {previewUrl && (
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={() => void handleRemove()}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-bold disabled:opacity-50"
                >
                  Quitar portada
                </button>
              )}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept={ALBUM_COVER_MIME_TYPES.join(',')}
              className="hidden"
              disabled={!canUpload}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
