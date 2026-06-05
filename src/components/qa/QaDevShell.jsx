import { isQaRewardDebugActive, isQaShellActive } from '../../qa/qaCore'
import { useAppStore } from '../../store/useAppStore'
import { QaBadge } from './QaBadge'
import { QaLauncher } from './QaLauncher'

/** Shell global DEV/QA — badge discreto + launcher; paneles opt-in. */
export function QaDevShell() {
  const captureRewardUiActive = useAppStore((state) => state.captureRewardUiActive)

  if (!isQaShellActive()) return null
  if (captureRewardUiActive && !isQaRewardDebugActive()) return null

  return (
    <>
      <QaBadge />
      <QaLauncher />
    </>
  )
}
