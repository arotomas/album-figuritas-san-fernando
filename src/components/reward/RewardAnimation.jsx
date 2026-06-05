import { FullScreenCaptureReward } from './FullScreenCaptureReward'

export function RewardAnimation({ figure, photoUrl, onComplete }) {
  return (
    <FullScreenCaptureReward
      figure={figure}
      photoUrl={photoUrl}
      onComplete={onComplete}
    />
  )
}
