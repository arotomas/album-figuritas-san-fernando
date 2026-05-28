import { readQaModeFromSearch, syncQaFromUrl, withQaParam } from '../qa/index.js'
import { hasMinimumRole } from './roles'
import { isProfileComplete } from './profileValidation'

function parseSearch(search = '') {
  const raw = search.startsWith('?') ? search.slice(1) : search
  return new URLSearchParams(raw)
}

function wantsPlayerApp(search = '') {
  const params = parseSearch(search)
  return params.get('player') === '1' || params.get('app') === '1'
}

/** Destino por defecto del panel (moderadores y admins). */
export const ADMIN_HOME_PATH = '/admin/players'

/** Destino por defecto del jugador. */
export const PLAYER_HOME_PATH = '/map'

/**
 * Ruta inicial tras login, OAuth o bootstrap según rol y perfil.
 * Staff (moderador+) va al panel; jugadores al mapa o profile-setup.
 */
export function getPostAuthPath({ profile, profileCompleted, search = '' }) {
  if (typeof window !== 'undefined') {
    syncQaFromUrl(search)
  }
  const qa = readQaModeFromSearch(search)
  const isStaff = hasMinimumRole(profile, 'moderator')
  const openPlayerApp = wantsPlayerApp(search)
  const completed =
    profileCompleted === true ||
    (profileCompleted !== false && isProfileComplete(profile))

  if (!completed && !isStaff) {
    return withQaParam('/profile-setup', qa)
  }

  if (isStaff && !openPlayerApp) {
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
