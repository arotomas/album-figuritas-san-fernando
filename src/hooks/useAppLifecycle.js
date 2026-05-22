import { useEffect, useRef } from 'react'
import { addPassiveListener } from '../utils/performance'

/**
 * Detecta foreground/background, lock screen y retorno a la app.
 */
export function useAppLifecycle({ onVisible, onHidden, enabled = true } = {}) {
  const onVisibleRef = useRef(onVisible)
  const onHiddenRef = useRef(onHidden)

  onVisibleRef.current = onVisible
  onHiddenRef.current = onHidden

  useEffect(() => {
    if (!enabled) return

    const handleVisible = () => onVisibleRef.current?.()
    const handleHidden = () => onHiddenRef.current?.()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') handleVisible()
      else handleHidden()
    }

    const removeVisibility = addPassiveListener(document, 'visibilitychange', onVisibility)
    const removePageShow = addPassiveListener(window, 'pageshow', handleVisible)
    const removePageHide = addPassiveListener(window, 'pagehide', handleHidden)
    const removeFocus = addPassiveListener(window, 'focus', handleVisible)
    const removeBlur = addPassiveListener(window, 'blur', handleHidden)

    return () => {
      removeVisibility()
      removePageShow()
      removePageHide()
      removeFocus()
      removeBlur()
    }
  }, [enabled])
}
