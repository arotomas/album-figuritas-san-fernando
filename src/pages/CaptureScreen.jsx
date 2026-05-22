import { LazyCamera } from '../components/performance/LazyCamera'

export function CaptureScreen() {
  return (
    <div className="screen-full overflow-hidden bg-black">
      <LazyCamera />
    </div>
  )
}
