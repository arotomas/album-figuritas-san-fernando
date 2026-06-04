/**
 * Progreso por álbum para la pantalla de selección (solo lectura).
 * Usa user_figures globales vía progress records; no altera captura ni ledger.
 */
export function countAlbumProgressFromMemberships(memberships, progressRecords) {
  const figureIds = new Set(
    (Array.isArray(memberships) ? memberships : [])
      .map((row) => row?.figure_id)
      .filter((id) => id != null)
      .map((id) => String(id)),
  )
  const total = figureIds.size
  if (total === 0) {
    return { obtained: 0, total: 0 }
  }

  let obtained = 0
  for (const record of Array.isArray(progressRecords) ? progressRecords : []) {
    if (!record?.obtenida || record.id == null) continue
    if (figureIds.has(String(record.id))) obtained += 1
  }

  return { obtained, total }
}
