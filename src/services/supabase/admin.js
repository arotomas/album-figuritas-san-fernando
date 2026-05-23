import { fetchProfile } from './auth'
import {
  isAdminProfile,
  isModeratorOrAdminProfile,
  isSuperAdminProfile,
  resolveProfileRole,
} from '../../utils/roles'

export async function getProfileAccess(userId) {
  if (!userId) {
    return {
      profile: null,
      role: 'user',
      isModeratorOrAdmin: false,
      isAdmin: false,
      isSuperAdmin: false,
    }
  }

  try {
    const profile = await fetchProfile(userId)
    const role = resolveProfileRole(profile)
    return {
      profile,
      role,
      isModeratorOrAdmin: isModeratorOrAdminProfile(profile),
      isAdmin: isAdminProfile(profile),
      isSuperAdmin: isSuperAdminProfile(profile),
    }
  } catch {
    return {
      profile: null,
      role: 'user',
      isModeratorOrAdmin: false,
      isAdmin: false,
      isSuperAdmin: false,
    }
  }
}

/**
 * Admin helper — content admin (admin + super_admin).
 * @param {string | null | undefined} userId
 */
export async function isAdmin(userId) {
  const access = await getProfileAccess(userId)
  return access.isAdmin
}

export async function isModeratorOrAdmin(userId) {
  const access = await getProfileAccess(userId)
  return access.isModeratorOrAdmin
}

export async function isSuperAdmin(userId) {
  const access = await getProfileAccess(userId)
  return access.isSuperAdmin
}
