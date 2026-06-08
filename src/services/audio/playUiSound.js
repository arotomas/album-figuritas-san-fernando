import { playGameSound } from './playGameSound'

/** Eventos de interfaz — no usar en captura, recompensas ni gameplay. */
export const UI_SOUND_EVENTS = {
  UI_CLICK: 'UI_CLICK',
  UI_TAB: 'UI_TAB',
  UI_OPEN: 'UI_OPEN',
  UI_CLOSE: 'UI_CLOSE',
  UI_CONFIRM: 'UI_CONFIRM',
  UI_SWITCH: 'UI_SWITCH',
  UI_ALBUM: 'UI_ALBUM',
  UI_MAP: 'UI_MAP',
}

/**
 * @param {keyof typeof UI_SOUND_EVENTS | string | false | true} uiSound
 * @returns {keyof typeof UI_SOUND_EVENTS | null}
 */
export function resolveUiSoundEvent(uiSound) {
  if (uiSound === false) return null
  if (uiSound === true) return UI_SOUND_EVENTS.UI_CLICK
  if (typeof uiSound === 'string' && uiSound in UI_SOUND_EVENTS) {
    return uiSound
  }
  if (typeof uiSound === 'string') return uiSound
  return UI_SOUND_EVENTS.UI_CLICK
}

export function playUiSound(eventKey) {
  if (!eventKey) return false
  return playGameSound(eventKey)
}
