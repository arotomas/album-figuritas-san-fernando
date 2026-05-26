/**
 * Política geográfica central — desacopla geometría SF de decisiones de aceptación.
 *
 * SWITCH GLOBAL (único lugar):
 *   1. VITE_GEO_POLICY en .env / Vercel  → strict | soft | unrestricted
 *   2. DEFAULT_GEO_POLICY_MODE abajo     → fallback si no hay env
 *
 * Modos:
 * - strict       → rechaza fixes GPS fuera de San Fernando
 * - soft         → acepta fuera de SF + banner informativo
 * - unrestricted → sin restricción geográfica (testing masivo)
 * - qa           → bypass total vía qaCore (bounds + accuracy en qaLocation)
 */

import { isWithinSanFernandoArea, SF_BOUNDS } from '../config/gps'
import { isLocationBypassEnabled } from '../qa/qaCore'

export const GEO_POLICY_MODE = {
  STRICT: 'strict',
  SOFT: 'soft',
  UNRESTRICTED: 'unrestricted',
  QA: 'qa',
}

/** Fallback temporal — cambiar acá o vía VITE_GEO_POLICY para volver a strict/soft. */
export const DEFAULT_GEO_POLICY_MODE = GEO_POLICY_MODE.UNRESTRICTED

export const GEO_PRIMARY_AREA = {
  id: 'san-fernando',
  label: 'San Fernando',
  bounds: SF_BOUNDS,
}

export const GEO_OUTSIDE_PRIMARY_LABEL = 'Fuera del área principal'
export const GEO_OUTSIDE_PRIMARY_HINT =
  'Estás fuera de San Fernando. Podés explorar el mapa; las figuritas están en la ciudad.'

const VALID_MODES = new Set(Object.values(GEO_POLICY_MODE))

function readConfiguredMode() {
  const raw = import.meta.env.VITE_GEO_POLICY?.trim().toLowerCase()
  if (raw && VALID_MODES.has(raw) && raw !== GEO_POLICY_MODE.QA) {
    return raw
  }
  return null
}

/** Modo efectivo en runtime. QA override > VITE_GEO_POLICY > DEFAULT_GEO_POLICY_MODE. */
export function getGeoPolicyMode() {
  if (isLocationBypassEnabled()) return GEO_POLICY_MODE.QA

  const configured = readConfiguredMode()
  if (configured) return configured

  return DEFAULT_GEO_POLICY_MODE
}

/** Geometría pura — identidad geográfica SF, sin política. */
export function isWithinPrimaryArea(lat, lng) {
  return isWithinSanFernandoArea(lat, lng)
}

/** @deprecated alias — preferir isWithinPrimaryArea */
export const isWithinSanFernandoPlayableArea = isWithinPrimaryArea

export function shouldRejectFixForGeoPolicy(lat, lng) {
  const mode = getGeoPolicyMode()
  if (
    mode === GEO_POLICY_MODE.QA ||
    mode === GEO_POLICY_MODE.SOFT ||
    mode === GEO_POLICY_MODE.UNRESTRICTED
  ) {
    return false
  }
  return !isWithinPrimaryArea(lat, lng)
}

export function allowsPreviewOutsidePrimaryArea() {
  return getGeoPolicyMode() !== GEO_POLICY_MODE.STRICT
}

export function shouldShowOutsidePrimaryWarning(lat, lng) {
  if (lat == null || lng == null) return false
  if (getGeoPolicyMode() !== GEO_POLICY_MODE.SOFT) return false
  return !isWithinPrimaryArea(lat, lng)
}

export function isPositionInPlayableArea(lat, lng) {
  return !shouldRejectFixForGeoPolicy(lat, lng)
}

export function getPrimaryAreaStatus(lat, lng) {
  if (lat == null || lng == null) return 'unknown'
  return isWithinPrimaryArea(lat, lng) ? 'inside' : 'outside'
}

export function evaluateGeoFix(lat, lng) {
  const mode = getGeoPolicyMode()
  const inPrimaryArea = lat != null && lng != null ? isWithinPrimaryArea(lat, lng) : false
  const rejectsFix = shouldRejectFixForGeoPolicy(lat, lng)

  return {
    mode,
    inPrimaryArea,
    acceptsFix: !rejectsFix,
    showOutsideWarning: shouldShowOutsidePrimaryWarning(lat, lng),
    discardReason: rejectsFix ? 'outside_bounds' : null,
    primaryAreaLabel: GEO_PRIMARY_AREA.label,
  }
}

export function getGeoPolicySnapshot() {
  return {
    mode: getGeoPolicyMode(),
    primaryArea: GEO_PRIMARY_AREA,
    outsidePrimaryLabel: GEO_OUTSIDE_PRIMARY_LABEL,
  }
}
