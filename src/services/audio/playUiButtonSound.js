import { playGameSound } from './playGameSound'

/** SFX de interfaz — no usar en captura, recompensas ni gameplay. */
export function playUiButtonSound() {
  return playGameSound('UI_BOTON')
}
