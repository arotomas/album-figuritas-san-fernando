import { supabase } from '../../lib/supabase'

const MEMBERSHIP_COLUMNS =
  'album_id, figure_id, collection_id, slot_number, sort_order, active_in_album, created_at, updated_at'

export function normalizeAlbumFigureMembership(row) {
  if (!row?.album_id || !row?.figure_id) return null

  return {
    albumId: String(row.album_id),
    figureId: String(row.figure_id),
    collectionId: row.collection_id ? String(row.collection_id) : null,
    slotNumber: row.slot_number != null ? Number(row.slot_number) : null,
    sortOrder: Number(row.sort_order) || 100,
    activeInAlbum: row.active_in_album !== false,
  }
}

function normalizeMembershipPayload(membership) {
  return {
    collection_id: membership.collectionId?.trim() || null,
    slot_number:
      membership.slotNumber === '' || membership.slotNumber == null
        ? null
        : Number(membership.slotNumber),
    sort_order: Number(membership.sortOrder) || 100,
    active_in_album: membership.activeInAlbum !== false,
    updated_at: new Date().toISOString(),
  }
}

export function validateAlbumFigureMembership(membership, { albumCollectionIds = [] } = {}) {
  if (membership.slotNumber !== '' && membership.slotNumber != null) {
    const slot = Number(membership.slotNumber)
    if (!Number.isFinite(slot) || slot <= 0) {
      return 'El número de slot debe ser un entero positivo.'
    }
  }

  const sortOrder = Number(membership.sortOrder)
  if (!Number.isFinite(sortOrder)) {
    return 'El orden debe ser un número válido.'
  }

  if (membership.collectionId?.trim()) {
    const collectionId = membership.collectionId.trim()
    if (albumCollectionIds.length > 0 && !albumCollectionIds.includes(collectionId)) {
      return 'El capítulo seleccionado no pertenece a este álbum.'
    }
  }

  return null
}

/** Todas las membresías del álbum (incluye inactivas en álbum). */
export async function fetchAlbumFiguresAdmin(albumId) {
  if (!albumId) return []

  const { data, error } = await supabase
    .from('album_figures')
    .select(MEMBERSHIP_COLUMNS)
    .eq('album_id', albumId)
    .order('sort_order', { ascending: true })
    .order('figure_id', { ascending: true })

  if (error) throw error
  return (data ?? []).map(normalizeAlbumFigureMembership).filter(Boolean)
}

export async function addFigureToAlbumAdmin(albumId, figureId, options = {}) {
  if (!albumId || !figureId) {
    throw new Error('Álbum y figurita son obligatorios.')
  }

  const payload = {
    album_id: String(albumId),
    figure_id: String(figureId),
    ...normalizeMembershipPayload({
      collectionId: options.collectionId ?? null,
      slotNumber: options.slotNumber ?? null,
      sortOrder: options.sortOrder ?? 100,
      activeInAlbum: options.activeInAlbum !== false,
    }),
    created_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('album_figures')
    .insert(payload)
    .select(MEMBERSHIP_COLUMNS)
    .single()

  if (error) {
    if (/duplicate key|album_figures_pkey/i.test(error.message ?? '')) {
      throw new Error('Esta figurita ya está asignada a este álbum.')
    }
    throw error
  }

  return normalizeAlbumFigureMembership(data)
}

function buildMembershipUpdatePayload(patch) {
  const payload = { updated_at: new Date().toISOString() }

  if ('collectionId' in patch) {
    payload.collection_id = patch.collectionId?.trim() || null
  }
  if ('slotNumber' in patch) {
    payload.slot_number =
      patch.slotNumber === '' || patch.slotNumber == null ? null : Number(patch.slotNumber)
  }
  if ('sortOrder' in patch) {
    payload.sort_order = Number(patch.sortOrder) || 100
  }
  if ('activeInAlbum' in patch) {
    payload.active_in_album = patch.activeInAlbum !== false
  }

  return payload
}

export async function updateAlbumFigureAdmin(albumId, figureId, patch) {
  const payload = buildMembershipUpdatePayload(patch)

  const { data, error } = await supabase
    .from('album_figures')
    .update(payload)
    .eq('album_id', albumId)
    .eq('figure_id', figureId)
    .select(MEMBERSHIP_COLUMNS)
    .single()

  if (error) throw error
  return normalizeAlbumFigureMembership(data)
}

export async function toggleAlbumFigureActiveAdmin(albumId, figureId, activeInAlbum) {
  return updateAlbumFigureAdmin(albumId, figureId, { activeInAlbum })
}

/** Quita la figurita del álbum sin borrar figures ni user_figures. */
export async function removeFigureFromAlbumAdmin(albumId, figureId) {
  const { error } = await supabase
    .from('album_figures')
    .delete()
    .eq('album_id', albumId)
    .eq('figure_id', figureId)

  if (error) throw error
  return { albumId, figureId }
}

export async function countActiveAlbumFiguresAdmin(albumId) {
  const { count, error } = await supabase
    .from('album_figures')
    .select('*', { count: 'exact', head: true })
    .eq('album_id', albumId)
    .eq('active_in_album', true)

  if (error) throw error
  return count ?? 0
}
