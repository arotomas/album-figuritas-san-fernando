import { useCallback, useEffect, useRef } from 'react'

export function useLatestRequest() {
  const requestIdRef = useRef(0)
  const abortRef = useRef(null)

  const begin = useCallback(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    requestIdRef.current += 1
    return {
      id: requestIdRef.current,
      signal: controller.signal,
    }
  }, [])

  const isLatest = useCallback((id) => id === requestIdRef.current, [])

  const cancelAll = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  useEffect(() => cancelAll, [cancelAll])

  return { begin, isLatest, cancelAll }
}
