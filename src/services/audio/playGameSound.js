import {
  GAME_SOUND_EVENTS,
  MUSIC_ENABLED,
  SOUNDS_ENABLED,
} from '../../config/audio'
import { useAppStore } from '../../store/useAppStore'
import { prefersReducedMotion } from '../../utils/performance'
import { soundService } from './SoundService'

function isDocumentHidden() {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden'
}

/** Preferencia del usuario + flags globales. No lanza errores. */
export function canPlayGameSounds() {
  if (!SOUNDS_ENABLED) return false
  if (isDocumentHidden()) return false
  if (prefersReducedMotion()) return false

  const { soundsEnabled } = useAppStore.getState()
  return soundsEnabled !== false
}

/** Reservado para música futura. */
export function canPlayMusic() {
  if (!MUSIC_ENABLED) return false
  const { musicEnabled } = useAppStore.getState()
  return musicEnabled === true
}

/**
 * Dispara un evento de juego → sonido del catálogo.
 * Sin archivo asignado es no-op silencioso.
 *
 * @param {keyof typeof GAME_SOUND_EVENTS | string} eventKey
 * @returns {boolean}
 */
export function playGameSound(eventKey) {
  if (!canPlayGameSounds()) return false

  const soundId = GAME_SOUND_EVENTS[eventKey] ?? eventKey
  if (!soundId) return false

  return soundService.play(soundId)
}

export function stopGameSound(eventKey) {
  const soundId = GAME_SOUND_EVENTS[eventKey] ?? eventKey
  if (!soundId) return
  soundService.stop(soundId)
}

export function stopAllGameSounds() {
  soundService.stopAll()
}
