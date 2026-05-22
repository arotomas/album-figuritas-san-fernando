import { useViewport } from '../../hooks/useViewport'

export function ViewportProvider({ children }) {
  useViewport()
  return children
}
