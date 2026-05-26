export {
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

export { isAdmin, isModeratorOrAdmin, isSuperAdmin, getProfileAccess } from './admin'

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

export { insertCapture, deleteAllUserCaptures } from './captures'

export {
  fetchUserFigures,
  replaceUserFigurePhoto,
  upsertUserFigure,
  deleteAllUserFigures,
  toRemoteFigureId,
} from './figures'

export { syncUnlockToSupabase, syncReplaceFigurePhoto, pullRemoteAlbum, syncResetUserProgressToSupabase } from './sync'

export {
  getAdminPlayers,
  getAdminPlayersPage,
  getAdminPlayerMetrics,
  getAdminPlayerMapMarkers,
  getAdminPlayerBasic,
  getAdminPlayerCaptures,
  getAdminPlayerAlbum,
  getAdminPlayerDetail,
  updatePlayerAlbumStatus,
  updateCaptureValidation,
  updatePlayerRole,
  deletePlayer,
} from './adminPlayers'

export {
  fetchProfileById,
  upsertUserProfile,
  completeUserProfile,
  updateProfileFields,
  isUsernameAvailable,
} from './profile'
