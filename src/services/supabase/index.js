export {
  ensureProfile,
  fetchProfile,
  getCurrentSession,
  getCurrentUserId,
  getSessionUserId,
  getVerifiedUser,
  isSupabaseConfigured,
  restoreSupabaseSession,
  signOutSupabase,
  signUpWithEmail,
  signInWithEmailPassword,
  signInWithGoogle,
  completeOAuthSession,
  requestPasswordReset,
  updatePassword,
  formatAuthErrorMessage,
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
  replaceUserFigurePhoto,
  upsertUserFigure,
  toRemoteFigureId,
} from './figures'

export { syncUnlockToSupabase, syncReplaceFigurePhoto, pullRemoteAlbum } from './sync'

export {
  getAdminPlayers,
  getAdminPlayerDetail,
  updatePlayerAlbumStatus,
  updateCaptureValidation,
} from './adminPlayers'

export {
  fetchProfileById,
  upsertUserProfile,
  completeUserProfile,
  updateProfileFields,
  isUsernameAvailable,
} from './profile'
