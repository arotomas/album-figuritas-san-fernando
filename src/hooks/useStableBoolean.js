import { useEffect, useState } from 'react'

/**
 * Retiene el valor true un poco más al salir — evita parpadeo por jitter de GPS.
 */
export function useStableBoolean(raw, { enterMs = 0, holdOffMs = 480 } = {}) {
  const [stable, setStable] = useState(Boolean(raw))

  useEffect(() => {
    let timer

    if (raw) {
      timer = setTimeout(() => setStable(true), Math.max(0, enterMs))
    } else {
      timer = setTimeout(() => setStable(false), Math.max(0, holdOffMs))
    }

    return () => clearTimeout(timer)
  }, [raw, enterMs, holdOffMs])

  return stable
}
