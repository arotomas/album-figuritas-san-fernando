import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getRingProgressFeedback,
  getRingProgressFeedbackStyle,
} from '../../utils/proximityExperience'

const PEAK_DISMISS_MS = 3800

export function RingProgressFeedback({
  progress = 0,
  isReady = false,
  isCapturing = false,
}) {
  const feedback = useMemo(() => getRingProgressFeedback(progress), [progress])
  const style = useMemo(() => getRingProgressFeedbackStyle(progress), [progress])
  const isPeakProgress = progress >= 0.97
  const [peakDismissed, setPeakDismissed] = useState(false)

  useEffect(() => {
    if (!isPeakProgress) {
      setPeakDismissed(false)
      return undefined
    }

    setPeakDismissed(false)
    const timer = window.setTimeout(() => setPeakDismissed(true), PEAK_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [isPeakProgress])

  const hidePeakMessage = feedback?.id === 'detected' && peakDismissed
  const visible = Boolean(feedback) && !isCapturing && !isReady && !hidePeakMessage

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.p
          key={feedback.id}
          initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
          animate={
            style.isPeak
              ? {
                  opacity: [style.opacity, 1, style.opacity],
                  y: 0,
                  filter: 'blur(0px)',
                  textShadow: [
                    style.textShadow,
                    '0 0 22px rgba(140,198,63,0.85), 0 0 44px rgba(140,198,63,0.45)',
                    style.textShadow,
                  ],
                }
              : {
                  opacity: style.opacity,
                  y: 0,
                  filter: 'blur(0px)',
                  textShadow: style.textShadow,
                }
          }
          exit={{ opacity: 0, y: -6, filter: 'blur(2px)' }}
          transition={
            style.isPeak
              ? {
                  opacity: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
                  textShadow: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
                  y: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
                  filter: { duration: 0.45 },
                }
              : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
          }
          className={`mt-5 max-w-[17rem] px-5 text-center text-[13px] leading-relaxed tracking-wide ${
            style.isPeak ? 'font-semibold uppercase' : 'font-normal'
          }`}
          style={{ color: style.color }}
        >
          {feedback.message}
        </motion.p>
      )}
    </AnimatePresence>
  )
}
