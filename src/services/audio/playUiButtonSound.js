import { playUiSound, UI_SOUND_EVENTS } from './playUiSound'

/**
 * @deprecated Usar playUiSound(UI_SOUND_EVENTS.UI_CLICK).
 * Mantiene compatibilidad temporal; ya no reproduce UI_BOTON legacy.
 */
export function playUiButtonSound() {
  return playUiSound(UI_SOUND_EVENTS.UI_CLICK)
}
