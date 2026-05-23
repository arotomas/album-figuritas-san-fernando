import { getFigureChallenge } from '../../utils/figureChallenges'
import { typeClasses } from '../../theme/typography'

export function FigureChallengeCard({ figure, compact = false }) {
  const challenge = getFigureChallenge(figure)
  if (!challenge) return null

  return (
    <div
      className={`rounded-2xl border border-progress/20 bg-progress/10 ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <p className={`${typeClasses.micro} text-progress`}>📸 Consigna original</p>
      <p className={`${compact ? 'text-sm' : 'text-base'} mt-2 font-bold text-warm-white`}>
        {challenge.title}
      </p>
      <p className={`mt-2 ${compact ? 'text-xs' : 'text-sm'} leading-6 text-white/65`}>
        {challenge.description}
      </p>
      {challenge.exampleUrl && !compact && (
        <img
          src={challenge.exampleUrl}
          alt="Ejemplo de consigna"
          className="mt-3 aspect-[4/3] w-full rounded-xl object-cover ring-1 ring-white/10"
          loading="lazy"
        />
      )}
    </div>
  )
}
