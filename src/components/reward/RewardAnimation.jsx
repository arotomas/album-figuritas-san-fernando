import { CardRevealSequence } from './CardRevealSequence'

export function RewardAnimation({ figure, photoUrl, onComplete }) {
  return (
    <CardRevealSequence
      figure={figure}
      photoUrl={photoUrl}
      onComplete={onComplete}
    />
  )
}
