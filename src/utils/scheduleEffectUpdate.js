import { startTransition } from 'react'

/** Evita cascadas de setState síncrono dentro de useEffect (React 19 error #185). */
export function scheduleEffectUpdate(run) {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(() => startTransition(run))
    return
  }
  startTransition(run)
}
