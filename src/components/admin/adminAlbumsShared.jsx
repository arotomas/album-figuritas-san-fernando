export const ALBUM_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
}

export const ALBUM_STATUS_OPTIONS = [
  { value: ALBUM_STATUS.DRAFT, label: 'Borrador' },
  { value: ALBUM_STATUS.PUBLISHED, label: 'Publicado' },
  { value: ALBUM_STATUS.ARCHIVED, label: 'Archivado' },
]

export const DEFAULT_ALBUM_FORM = {
  id: '',
  slug: '',
  title: '',
  subtitle: '',
  description: '',
  cover_image: '',
  status: ALBUM_STATUS.DRAFT,
  active: true,
  is_default: false,
  sort_order: 100,
  map_center_lat: '',
  map_center_lng: '',
  map_zoom: '',
  completion_bonus_points: 0,
}

export function buildAlbumId(title) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export function toAlbumForm(album) {
  if (!album) return DEFAULT_ALBUM_FORM

  return {
    id: album.id ?? '',
    slug: album.slug ?? album.id ?? '',
    title: album.title ?? '',
    subtitle: album.subtitle ?? '',
    description: album.description ?? '',
    cover_image: album.coverImage ?? album.cover_image ?? '',
    status: album.status ?? ALBUM_STATUS.DRAFT,
    active: album.active !== false,
    is_default: Boolean(album.isDefault ?? album.is_default),
    sort_order: album.sortOrder ?? album.sort_order ?? 100,
    map_center_lat:
      album.mapCenterLat != null
        ? album.mapCenterLat
        : album.map_center_lat != null
          ? album.map_center_lat
          : '',
    map_center_lng:
      album.mapCenterLng != null
        ? album.mapCenterLng
        : album.map_center_lng != null
          ? album.map_center_lng
          : '',
    map_zoom: album.mapZoom ?? album.map_zoom ?? '',
    completion_bonus_points:
      album.completionBonusPoints ?? album.completion_bonus_points ?? 0,
  }
}

export function validateAlbumForm(form, { isEdit = false } = {}) {
  if (!form.title?.trim()) return 'El título es obligatorio.'
  if (!isEdit && !form.id?.trim()) return 'El ID es obligatorio.'
  if (!form.slug?.trim()) return 'El slug es obligatorio.'
  if (!/^[a-z0-9-]+$/.test(form.slug.trim())) {
    return 'El slug solo puede contener minúsculas, números y guiones.'
  }
  if (!ALBUM_STATUS_OPTIONS.some((option) => option.value === form.status)) {
    return 'El estado no es válido.'
  }

  const bonus = Number(form.completion_bonus_points)
  if (!Number.isFinite(bonus) || bonus < 0) {
    return 'Los puntos bonus deben ser un número mayor o igual a 0.'
  }

  if (form.map_zoom !== '' && form.map_zoom != null) {
    const zoom = Number(form.map_zoom)
    if (!Number.isFinite(zoom) || zoom < 1 || zoom > 22) {
      return 'El zoom del mapa debe estar entre 1 y 22.'
    }
  }

  if (form.map_center_lat !== '' && form.map_center_lat != null) {
    const lat = Number(form.map_center_lat)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return 'Latitud inválida.'
    }
  }

  if (form.map_center_lng !== '' && form.map_center_lng != null) {
    const lng = Number(form.map_center_lng)
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return 'Longitud inválida.'
    }
  }

  return null
}

export function getAlbumStatusBadgeClass(status) {
  switch (status) {
    case ALBUM_STATUS.PUBLISHED:
      return 'bg-progress/15 text-progress'
    case ALBUM_STATUS.ARCHIVED:
      return 'bg-slate-200 text-slate-700'
    default:
      return 'bg-amber-100 text-amber-900'
  }
}

export function getAlbumStatusLabel(status) {
  return ALBUM_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
}
