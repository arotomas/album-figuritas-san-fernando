import { useEffect, useState } from 'react'
import { getQaState, subscribeQaState } from '../utils/diagnostics'

export function useOfflineStatus() {
  const [networkOffline, setNetworkOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  )
  const [qaOffline, setQaOffline] = useState(() => getQaState().simulateOffline)

  useEffect(() => {
    const handleOnline = () => setNetworkOffline(false)
    const handleOffline = () => setNetworkOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const unsubQa = subscribeQaState(() => {
      setQaOffline(getQaState().simulateOffline)
    })

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      unsubQa()
    }
  }, [])

  const isOffline = networkOffline || qaOffline

  return { isOffline, isOnline: !isOffline }
}
