import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { READY_SNAP_MS } from '../../config/captureFeel'

export function CaptureButton({ disabled, isReady, onCapture }) {
  const [readyCue, setReadyCue] = useState(false)
  const wasReadyRef = useRef(false)

  useEffect(() => {
    if (isReady && !wasReadyRef.current) {
      setReadyCue(true)
      const timer = window.setTimeout(() => setReadyCue(false), READY_SNAP_MS + 260)
      wasReadyRef.current = true
      return () => window.clearTimeout(timer)
    }
    if (!isReady) {
      wasReadyRef.current = false
      setReadyCue(false)
    }
    return undefined
  }, [isReady])

  return (
    <div className="flex flex-col items-center gap-3">
      {isReady && (
        <motion.p
          key="ready-label"
          initial={{ opacity: 0, y: 10, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="text-sm font-semibold tracking-wide text-progress"
        >
          ¡Listo para capturar!
        </motion.p>
      )}

      <motion.button
        type="button"
        disabled={disabled}
        whileTap={disabled ? {} : { scale: 0.88 }}
        onClick={onCapture}
        aria-label="Capturar foto"
        animate={{
          scale: readyCue ? [1, 1.09, 1.03] : isReady ? 1.03 : 1,
        }}
        transition={{
          duration: readyCue ? 0.32 : 0.4,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 transition-colors duration-300 ${
          isReady
            ? 'border-progress bg-white/12 shadow-[0_0_28px_rgba(140,198,63,0.35)]'
            : 'border-white/40 bg-white/5 opacity-60'
        }`}
      >
        {isReady && (
          <motion.span
            animate={
              readyCue
                ? { scale: [1, 1.22, 1.08], opacity: [0.5, 0.95, 0.55] }
                : { scale: [1, 1.06, 1], opacity: [0.35, 0.6, 0.35] }
            }
            transition={{
              duration: readyCue ? 0.32 : 2,
              repeat: readyCue ? 0 : Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 rounded-full border-2 border-progress/60"
          />
        )}
        <span
          className={`h-14 w-14 rounded-full transition-colors duration-300 ${
            isReady ? 'bg-white shadow-[0_0_16px_rgba(255,255,255,0.45)]' : 'bg-white/50'
          }`}
        />
      </motion.button>
    </div>
  )
}
