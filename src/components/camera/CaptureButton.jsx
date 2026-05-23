import { motion } from 'framer-motion'

export function CaptureButton({ disabled, isReady, onCapture }) {
  return (
    <div className="flex flex-col items-center gap-3">
      {isReady && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-semibold text-progress"
        >
          ¡Listo para capturar!
        </motion.p>
      )}

      <motion.button
        type="button"
        disabled={disabled}
        whileTap={disabled ? {} : { scale: 0.9 }}
        onClick={onCapture}
        aria-label="Capturar foto"
        className={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 transition-all ${
          isReady
            ? 'border-progress bg-white/10 shadow-lg shadow-progress/30'
            : 'border-white/40 bg-white/5 opacity-60'
        }`}
      >
        {isReady && (
          <motion.span
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="absolute inset-0 rounded-full border-2 border-progress/50"
          />
        )}
        <span
          className={`h-14 w-14 rounded-full ${
            isReady ? 'bg-white' : 'bg-white/50'
          }`}
        />
      </motion.button>
    </div>
  )
}
