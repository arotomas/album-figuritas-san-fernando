import { fetchProfile } from './auth'

/**
 * Admin helper — listo para panel futuro.
 * @param {string | null | undefined} userId
 */
export async function isAdmin(userId) {
  if (!userId) return false

  try {
    const profile = await fetchProfile(userId)
    return Boolean(profile?.is_admin)
  } catch {
    return false
  }
}
