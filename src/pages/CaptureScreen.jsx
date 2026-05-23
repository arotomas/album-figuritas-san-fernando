import { LazyCamera } from '../components/performance/LazyCamera'

export function CaptureScreen() {
  return (
    <div className="screen-full overflow-hidden bg-warm-white">
      <LazyCamera />
    </div>
  )
}
