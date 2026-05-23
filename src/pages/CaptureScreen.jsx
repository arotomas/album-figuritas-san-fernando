import { LazyCamera } from '../components/performance/LazyCamera'
import { isNativeCameraOnly } from '../utils/device'

export function CaptureScreen() {
  const nativeOnly = isNativeCameraOnly()

  return (
    <div
      className={`screen-full overflow-hidden ${
        nativeOnly ? 'bg-gradient-to-b from-zinc-800 to-zinc-950' : 'bg-black'
      }`}
    >
      <LazyCamera />
    </div>
  )
}
