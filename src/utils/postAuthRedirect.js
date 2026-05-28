import { readQaModeFromSearch, syncQaFromUrl, withQaParam } from '../qa/index.js'
import { hasMinimumRole } from './roles'
import { isProfileComplete } from './profileValidation'

function parseSearch(search = '') {
  const raw = search.startsWith('?') ? search.slice(1) : search
  return new URLSearchParams(raw)
}

function wantsAdminPanel(search = '') {
  const params = parseSearch(search)
  return params.get('admin') === '1'
}

/** Destino por defecto del panel (moderadores y admins). */
export const ADMIN_HOME_PATH = '/admin/players'

/** Destino por defecto del jugador. */
export const PLAYER_HOME_PATH = '/map'

/**
 * Ruta inicial tras login, OAuth o bootstrap según rol y perfil.
 * Todos los usuarios (incluido staff) entran al mapa; el panel admin solo con ?admin=1 o /admin.
 */
export function getPostAuthPath({ profile, profileCompleted, search = '' }) {
  if (typeof window !== 'undefined') {
    syncQaFromUrl(search)
  }
  const qa = readQaModeFromSearch(search)
  const isStaff = hasMinimumRole(profile, 'moderator')
  const openAdminPanel = wantsAdminPanel(search)
  const completed =
    profileCompleted === true ||
    (profileCompleted !== false && isProfileComplete(profile))

  if (!completed && !isStaff) {
    return withQaParam('/profile-setup', qa)
  }

  if (isStaff && openAdminPanel) {
    return withQaParam(ADMIN_HOME_PATH, qa)
  }

  return withQaParam(PLAYER_HOME_PATH, qa)
}

export function getPostAuthPathFromStore(state, search = '') {
  return getPostAuthPath({
    profile: state.supabaseProfile,
    profileCompleted: state.profileCompleted,
    search,
  })
}
