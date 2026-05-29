/**
 * Flags temporales de preview (revertir tras diagnóstico).
 */

export {
  MAP_ROTATION_PROGRESSIVE_STEP,
  MAP_ROTATION_PROGRESSIVE_LABEL,
} from './mapRotationProgressive'

export {
  MAP_ROTATION_MODE,
} from './mapRotationMode'

export {
  getMapRotationControllerFlags,
  isMapRotationControllerMounted,
  isMapRotationInteractionActive,
  canWriteMapPaneStyles,
} from './mapRotationFlags'

export { MAP_ROTATION_BINARY, MAP_ROTATION_BINARY_LABEL } from './mapRotationBinaryTest'

export const MAP_ISOLATION_DISABLE_EXPLORATION_CAMERA = false
