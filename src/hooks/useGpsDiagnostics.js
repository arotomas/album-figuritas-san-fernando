import { useEffect, useState } from 'react'
import { getGpsDiagnostics, subscribeGpsDiagnostics } from '../utils/gpsDiagnostics'

export function useGpsDiagnostics() {
  const [diagnostics, setDiagnostics] = useState(() => getGpsDiagnostics())

  useEffect(() => subscribeGpsDiagnostics(setDiagnostics), [])

  return diagnostics
}
