import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  canUseTestFigure,
  getQaCoreSnapshot,
  isGpsPanelVisible,
  isLocationPanelVisible,
  isQaMasterActive,
  isDevBuild,
  isQaShellActive,
  subscribeQaUrlFlags,
  syncQaFromUrl,
  withQaParam,
} from './qaCore'
import { subscribeQaRuntime } from './qaState'

export function useQaCore() {
  const location = useLocation()
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    syncQaFromUrl(location.search)
  }, [location.search])

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1)
    const unsubRuntime = subscribeQaRuntime(bump)
    const unsubUrl = subscribeQaUrlFlags(bump)
    return () => {
      unsubRuntime()
      unsubUrl()
    }
  }, [])

  return useMemo(() => {
    const snapshot = getQaCoreSnapshot()
    const qaActive = isQaMasterActive()

    return {
      ...snapshot,
      isQaActive: qaActive,
      isDevMode: isDevBuild(),
      showQaTools: isQaShellActive(),
      canUseTestFigure: canUseTestFigure(),
      withQa: (path) => withQaParam(path, qaActive),
    }
  }, [location.pathname, location.search, revision])
}

export function useQaPanelVisibility() {
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    return subscribeQaRuntime(() => setRevision((value) => value + 1))
  }, [])

  return useMemo(
    () => ({
      gps: isGpsPanelVisible(),
      location: isLocationPanelVisible(),
    }),
    [revision],
  )
}

/** @deprecated alias — usar useQaCore */
export const useQaMode = useQaCore
