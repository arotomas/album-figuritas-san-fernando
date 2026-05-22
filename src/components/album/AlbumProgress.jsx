import { memo } from 'react'
import { m } from 'framer-motion'
import { album } from '../../theme/album'
import { motion as motionTokens } from '../../theme/motion'
import { prefersReducedMotion } from '../../utils/performance'

function AlbumProgressInner({ progress, total }) {
  const reduced = prefersReducedMotion()
  const ratio = total > 0 ? progress / total : 0

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex flex-1 gap-1 overflow-hidden rounded-full bg-border/80 p-0.5">
        {Array.from({ length: total }).map((_, index) => {
          const filled = index < progress

          return (
            <div
              key={index}
              className="relative h-2 flex-1 overflow-hidden rounded-sm bg-border/60"
            >
              {filled && (
                <m.div
                  layout
                  initial={reduced ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    ...motionTokens.spring.gentle,
                    delay: reduced ? 0 : index * 0.06,
                  }}
                  className="album-progress-fill absolute inset-0 origin-left rounded-sm bg-gradient-to-r from-lime-400 via-progress to-lime-500"
                />
              )}
            </div>
          )
        })}

        {/* Soft shine overlay on filled portion */}
        {!reduced && ratio > 0 && (
          <div
            className="album-progress-shine pointer-events-none absolute inset-y-0.5 left-0.5 rounded-full"
            style={{ width: `calc(${ratio * 100}% - 4px)` }}
            aria-hidden
          />
        )}
      </div>

      <span className="font-display text-sm font-semibold tabular-nums text-ink">
        {progress}
        <span className="text-muted">/{total}</span>
      </span>
    </div>
  )
}

export const AlbumProgress = memo(AlbumProgressInner)
