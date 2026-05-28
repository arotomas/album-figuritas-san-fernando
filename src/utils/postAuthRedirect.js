import { isQaMode, withQaParam } from '../qa/index.js'
import { hasMinimumRole } from './roles'
import { isProfileComplete } from './profileValidation'

/** Destino por defecto del panel (moderadores y admins). */
export const ADMIN_HOME_PATH = '/admin/players'

/** Destino por defecto del jugador. */
export const PLAYER_HOME_PATH = '/map'

/**
 * Ruta inicial tras login, OAuth o bootstrap según rol y perfil.
 * Staff (moderador+) va al panel; jugadores al mapa o profile-setup.
 */
export function getPostAuthPath({ profile, profileCompleted, search = '' }) {
  const qa = isQaMode(search)
  const isStaff = hasMinimumRole(profile, 'moderator')
  const completed =
    profileCompleted === true ||
    (profileCompleted !== false && isProfileComplete(profile))

  if (!completed && !isStaff) {
    return withQaParam('/profile-setup', qa)
  }

  if (isStaff) {
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
