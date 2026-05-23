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
  uploadMarkerIcon,
  testStorageUpload,
  buildCaptureStoragePath,
  buildMarkerIconStoragePath,
  CAPTURES_BUCKET,
  MARKER_ICONS_BUCKET,
  MARKER_ICON_MAX_BYTES,
  MARKER_ICON_MIME_TYPES,
  STORAGE_BUCKET_MAX_BYTES,
} from './storage'

export { insertCapture } from './captures'

export {
  fetchUserFigures,
  upsertUserFigure,
  toRemoteFigureId,
} from './figures'

export { syncUnlockToSupabase, pullRemoteAlbum } from './sync'

export {
  getAdminPlayers,
  getAdminPlayerDetail,
  updatePlayerAlbumStatus,
  updateCaptureValidation,
} from './adminPlayers'
