import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'figuritas-capture-ring-hint'
const MAX_SESSIONS = 4

function readCount() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 0
    const parsed = JSON.parse(raw)
    return Number(parsed?.sessions ?? 0)
  } catch {
    return 0
  }
}

function writeCount(sessions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions }))
  } catch {
    // ignore quota errors
  }
}

/** Onboarding implícito del anillo — se oculta solo tras algunos usos. */
export function useRingProximityHint({ enabled = true } = {}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setVisible(false)
      return undefined
    }

    const sessions = readCount()
    if (sessions >= MAX_SESSIONS) {
      setVisible(false)
      return undefined
    }

    setVisible(true)
    writeCount(sessions + 1)

    const timer = window.setTimeout(() => setVisible(false), 14_000)
    return () => window.clearTimeout(timer)
  }, [enabled])

  const dismiss = useCallback(() => {
    setVisible(false)
    writeCount(MAX_SESSIONS)
  }, [])

  return { visible, dismiss }
}
