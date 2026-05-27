import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getRingProgressFeedback,
  getRingProgressFeedbackStyle,
} from '../../utils/proximityExperience'

const PEAK_DISMISS_MS = 4200

/** Agrupa progreso para que el copy respire — menos saltos entre frases. */
function bucketProgress(progress) {
  return Math.round(Math.min(1, Math.max(0, progress ?? 0)) * 18) / 18
}

export function RingProgressFeedback({
  progress = 0,
  isReady = false,
  isCapturing = false,
}) {
  const displayProgress = bucketProgress(progress)
  const feedback = useMemo(
    () => getRingProgressFeedback(displayProgress),
    [displayProgress],
  )
  const style = useMemo(
    () => getRingProgressFeedbackStyle(displayProgress),
    [displayProgress],
  )
  const isPeakProgress = displayProgress >= 0.97
  const [peakDismissed, setPeakDismissed] = useState(false)
  const lastTierRef = useRef(null)
  const [settledFeedback, setSettledFeedback] = useState(null)

  useEffect(() => {
    if (!feedback) {
      lastTierRef.current = null
      setSettledFeedback(null)
      return undefined
    }

    if (!lastTierRef.current || feedback.id !== lastTierRef.current) {
      const timer = window.setTimeout(() => {
        lastTierRef.current = feedback.id
        setSettledFeedback(feedback)
      }, lastTierRef.current ? 280 : 0)
      return () => window.clearTimeout(timer)
    }

    setSettledFeedback(feedback)
    return undefined
  }, [feedback])

  useEffect(() => {
    if (!isPeakProgress) {
      setPeakDismissed(false)
      return undefined
    }

    setPeakDismissed(false)
    const timer = window.setTimeout(() => setPeakDismissed(true), PEAK_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [isPeakProgress])

  const hidePeakMessage = settledFeedback?.id === 'detected' && peakDismissed
  const visible =
    Boolean(settledFeedback) && !isCapturing && !isReady && !hidePeakMessage

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.p
          key={settledFeedback.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{
            opacity: style.opacity,
            y: 0,
          }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
          className={`mt-5 max-w-[18rem] px-5 text-center text-sm leading-relaxed tracking-wide ${
            style.isPeak ? 'font-semibold' : 'font-normal'
          }`}
          style={{ color: style.color, textShadow: style.textShadow, opacity: style.opacity }}
        >
          {settledFeedback.message}
        </motion.p>
      )}
    </AnimatePresence>
  )
}
