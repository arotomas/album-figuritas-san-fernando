export const PROFILE_ROLES = ['user', 'moderator', 'admin', 'super_admin']

export const ROLE_LABELS = {
  user: 'Jugador',
  moderator: 'Moderador',
  admin: 'Admin',
  super_admin: 'Super admin',
}

const ACCESS_LEVEL = {
  user: 0,
  moderator: 1,
  admin: 2,
  super_admin: 3,
}

export function resolveProfileRole(profile) {
  if (!profile) return 'user'
  if (profile.role && PROFILE_ROLES.includes(profile.role)) return profile.role
  return profile.is_admin ? 'admin' : 'user'
}

export function getRoleAccessLevel(profile) {
  return ACCESS_LEVEL[resolveProfileRole(profile)] ?? 0
}

export function hasMinimumRole(profile, minRole) {
  return getRoleAccessLevel(profile) >= (ACCESS_LEVEL[minRole] ?? 0)
}

export function isSuperAdminProfile(profile) {
  return resolveProfileRole(profile) === 'super_admin'
}

export function isAdminProfile(profile) {
  return hasMinimumRole(profile, 'admin')
}

export function isModeratorOrAdminProfile(profile) {
  return hasMinimumRole(profile, 'moderator')
}

export function formatRoleLabel(role) {
  return ROLE_LABELS[role] ?? role ?? 'Jugador'
}
