import { isQaShellActive } from '../../qa/qaCore'
import { QaBadge } from './QaBadge'
import { QaLauncher } from './QaLauncher'

/** Shell global DEV/QA — badge discreto + launcher; paneles opt-in. */
export function QaDevShell() {
  if (!isQaShellActive()) return null

  return (
    <>
      <QaBadge />
      <QaLauncher />
    </>
  )
}
