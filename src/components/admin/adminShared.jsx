import { isBonusFigure, isMainAlbumFigure } from '../../utils/figureGameRules'
import { ALBUM_COLLECTIONS, COLLECTION_LIST } from '../../config/albumCollections'

export const RARITY_OPTIONS = ['común', 'rara', 'épica', 'legendaria']

export const COLLECTION_OPTIONS = COLLECTION_LIST.map((collection) => ({
  id: collection.id,
  label: collection.label,
  icon: collection.icon,
  track: collection.track,
}))

export const COLLECTION_ID_SET = new Set(Object.keys(ALBUM_COLLECTIONS))

export const ALBUM_REVIEW_LABELS = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

export const DEFAULT_FIGURE_FORM = {
  id: '',
  title: '',
  description: '',
  rarity: 'común',
  image_url: '',
  lat: '',
  lng: '',
  capture_radius: 250,
  is_bonus: false,
  is_hidden: false,
  unlock_order: '',
  reveal_after_count: 0,
  bonus_type: '',
  reveal_radius: 200,
  marker_icon_url: '',
  marker_icon_size: 48,
  challenge_title: '',
  challenge_description: '',
  challenge_type: '',
  challenge_example_image_url: '',
  collection_id: '',
  category: '',
  page: '',
  event_id: '',
  event_starts_at: '',
  event_ends_at: '',
  active: true,
}

export function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('es-AR')
}

function toDatetimeLocalValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function getCollectionLabel(collectionId) {
  if (!collectionId) return 'Auto (reglas cliente)'
  return ALBUM_COLLECTIONS[collectionId]?.label ?? collectionId
}

export function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
    </div>
  )
}

export function getGamePlacement(figure) {
  const isBonus = isBonusFigure(figure)
  const isMain = isMainAlbumFigure(figure)
  return {
    isBonus,
    isMain,
    label: isBonus ? 'Bonus / Secreta' : 'Álbum principal',
    help: isBonus
      ? 'No cuenta para el progreso principal. Puede aparecer como secreta o especial.'
      : 'Se muestra dentro del progreso principal del jugador.',
    rarity: normalizeText(figure?.rarity ?? figure?.rareza),
    isHidden: Boolean(figure?.is_hidden),
    isForcedBonus: Boolean(figure?.is_bonus),
  }
}

export function GameTypeBadges({ figure }) {
  const placement = getGamePlacement(figure)
  const badges = [
    placement.isBonus
      ? { label: 'Bonus', className: 'bg-violet-100 text-violet-800' }
      : { label: 'Principal', className: 'bg-progress/15 text-ink' },
  ]

  if (placement.isHidden) badges.push({ label: 'Oculta', className: 'bg-slate-900 text-white' })
  if (placement.rarity === 'legendaria') {
    badges.push({ label: 'Legendaria', className: 'bg-amber-100 text-amber-800' })
  }
  if (placement.rarity === 'épica' || placement.rarity === 'epica') {
    badges.push({ label: 'Épica', className: 'bg-purple-100 text-purple-800' })
  }

  return (
    <div className="flex min-w-[150px] flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span
          key={badge.label}
          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${badge.className}`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  )
}

export function ReviewBadge({ status = 'pending' }) {
  const className =
    status === 'approved'
      ? 'bg-progress/15 text-ink'
      : status === 'rejected'
        ? 'bg-red-100 text-red-800'
        : 'bg-amber-100 text-amber-800'

  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${className}`}>
      {ALBUM_REVIEW_LABELS[status] ?? status}
    </span>
  )
}

export function toFigureForm(figure) {
  if (!figure) return DEFAULT_FIGURE_FORM

  return {
    title: figure.title ?? '',
    id: figure.id ?? '',
    description: figure.description ?? '',
    rarity: figure.rarity ?? 'común',
    image_url: figure.image_url ?? '',
    lat: figure.lat ?? '',
    lng: figure.lng ?? '',
    capture_radius: figure.capture_radius ?? 250,
    is_bonus: Boolean(figure.is_bonus),
    is_hidden: Boolean(figure.is_hidden),
    unlock_order: figure.unlock_order ?? '',
    reveal_after_count: figure.reveal_after_count ?? 0,
    bonus_type: figure.bonus_type ?? '',
    reveal_radius: figure.reveal_radius ?? 200,
    marker_icon_url: figure.marker_icon_url ?? '',
    marker_icon_size: figure.marker_icon_size ?? 48,
    challenge_title: figure.challenge_title ?? '',
    challenge_description: figure.challenge_description ?? '',
    challenge_type: figure.challenge_type ?? '',
    challenge_example_image_url: figure.challenge_example_image_url ?? '',
    collection_id: figure.collection_id ?? '',
    category: figure.category ?? '',
    page: figure.page ?? '',
    event_id: figure.event_id ?? '',
    event_starts_at: toDatetimeLocalValue(figure.event_starts_at),
    event_ends_at: toDatetimeLocalValue(figure.event_ends_at),
    active: Boolean(figure.active),
  }
}

export function validateFigureForm(form) {
  if (!form.title.trim()) return 'El título es obligatorio.'
  if (!RARITY_OPTIONS.includes(form.rarity)) return 'La rareza no es válida.'
  if (form.lat === '' || form.lng === '') return 'Latitud y longitud son obligatorias.'

  const lat = Number(form.lat)
  const lng = Number(form.lng)
  const radius = Number(form.capture_radius || 250)
  const revealRadius = Number(form.reveal_radius || 200)
  const markerIconSize = Number(form.marker_icon_size || 48)

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return 'La latitud no es válida.'
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return 'La longitud no es válida.'
  if (!Number.isFinite(radius) || radius <= 0) return 'El radio de captura no es válido.'
  if (!Number.isFinite(revealRadius) || revealRadius <= 0) return 'El radio de revelado no es válido.'
  if (!Number.isFinite(markerIconSize) || markerIconSize <= 0) return 'El tamaño del ícono no es válido.'
  if (form.is_bonus && form.bonus_type && !['epic', 'legendary'].includes(form.bonus_type)) {
    return 'El tipo bonus no es válido.'
  }
  if (form.collection_id && !COLLECTION_ID_SET.has(form.collection_id)) {
    return 'La colección seleccionada no es válida.'
  }
  if (form.page !== '' && form.page != null) {
    const page = Number(form.page)
    if (!Number.isFinite(page) || page < 1) return 'La página del álbum no es válida.'
  }
  if (form.event_starts_at && form.event_ends_at) {
    const starts = Date.parse(form.event_starts_at)
    const ends = Date.parse(form.event_ends_at)
    if (Number.isFinite(starts) && Number.isFinite(ends) && ends < starts) {
      return 'La fecha de fin del evento no puede ser anterior al inicio.'
    }
  }

  return null
}

export function PhotoPreviewModal({ preview, onClose }) {
  if (!preview) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-8">
      <div className="max-h-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="font-bold text-ink">{preview.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
          >
            Cerrar
          </button>
        </div>
        <img src={preview.url} alt={preview.title} className="max-h-[82vh] w-full object-contain" />
      </div>
    </div>
  )
}

export function AdminPageHeader({ eyebrow, title, loading, children }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-wide text-muted">{eyebrow}</p>
        )}
        <h2 className="mt-1 text-4xl font-black">{title}</h2>
      </div>
      <div className="flex items-center gap-3">
        {loading && <p className="text-sm font-medium text-muted">Cargando datos…</p>}
        {children}
      </div>
    </div>
  )
}

export function AdminErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      {message}
    </div>
  )
}
