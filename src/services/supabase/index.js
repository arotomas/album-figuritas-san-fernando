export {
  ensureProfile,
  fetchProfile,
  getCurrentSession,
  getCurrentUserId,
  getSessionUserId,
  getVerifiedUser,
  isSupabaseConfigured,
  loginWithUsername,
  restoreSupabaseSession,
  signOutSupabase,
} from './auth'

export { isAdmin } from './admin'

export {
  uploadCapturePhoto,
  testStorageUpload,
  buildCaptureStoragePath,
  CAPTURES_BUCKET,
  STORAGE_BUCKET_MAX_BYTES,
} from './storage'

export { insertCapture } from './captures'

export {
  fetchUserFigures,
  upsertUserFigure,
  toRemoteFigureId,
} from './figures'

export { syncUnlockToSupabase, pullRemoteAlbum } from './sync'
