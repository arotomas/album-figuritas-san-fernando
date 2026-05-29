import {
  getActiveMapDebugFlagLabels,
  isMapDebugActive,
  isMapDebugFlagEnabled,
  MAP_DEBUG_FLAG,
} from '../../config/mapDebug'
import { isCameraMoveLoggingEnabled } from '../../utils/cameraMoveLog'

/** Banner fijo cuando hay flags de diagnóstico activos. */
export function MapDebugStatusBanner() {
  if (!isMapDebugActive()) return null

  const labels = getActiveMapDebugFlagLabels()
  const autoFollowOff = isMapDebugFlagEnabled(MAP_DEBUG_FLAG.AUTO_FOLLOW)
  const cameraLog = isCameraMoveLoggingEnabled()

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-[8000] flex justify-center px-2"
      role="status"
    >
      <p className="rounded-lg bg-black/80 px-3 py-1.5 text-center font-mono text-[10px] leading-snug text-lime-300">
        MAP DEBUG: {labels.join(' · ')}
        <span className="mt-0.5 block text-white/50">
          MapFlyController: {autoFollowOff ? 'OFF' : 'ON ⚠️'}
          {cameraLog ? ' · logs [CAMERA_MOVE]' : ''}
        </span>
      </p>
    </div>
  )
}
