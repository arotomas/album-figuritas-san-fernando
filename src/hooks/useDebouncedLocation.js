import { useEffect, useRef, useState } from 'react'

/**
 * Suaviza updates de GPS para proximidad y markers.
 * El primer fix es inmediato; los siguientes se debouncen.
 * Limpia cuando la señal confiable desaparece.
 */
export function useDebouncedLocation(position, delayMs = 900) {
  const [debounced, setDebounced] = useState(position)
  const timerRef = useRef(null)
  const isFirstRef = useRef(true)

  useEffect(() => {
    if (!position) {
      isFirstRef.current = true
      clearTimeout(timerRef.current)
      setDebounced(null)
      return
    }

    if (isFirstRef.current) {
      isFirstRef.current = false
      setDebounced(position)
      return
    }

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(position), delayMs)

    return () => clearTimeout(timerRef.current)
  }, [position, delayMs])

  return debounced
}
