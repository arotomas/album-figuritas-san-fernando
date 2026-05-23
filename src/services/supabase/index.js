export {
  ensureAnonymousSession,
  ensureProfile,
  fetchProfile,
  getCurrentSession,
  getCurrentUserId,
  isSupabaseConfigured,
  loginWithUsername,
  updateProfileUsername,
} from './auth'

export { isAdmin } from './admin'

export { uploadCapturePhoto } from './storage'

export {
  fetchUserFigures,
  upsertUserFigure,
  toRemoteFigureId,
} from './figures'

export { insertCapture } from './captures'

export { syncUnlockToSupabase, pullRemoteAlbum } from './sync'
