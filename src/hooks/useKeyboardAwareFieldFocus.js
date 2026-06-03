import { useEffect } from 'react'

const FOCUSABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]'

/**
 * Mantiene el campo activo visible cuando aparece el teclado (Safari iOS / PWA).
 * Usar en el contenedor del formulario; el scroll debe vivir en un ancestro scroll-y-app.
 */
export function useKeyboardAwareFieldFocus(containerRef) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const scrollFocusedField = (target) => {
      if (!(target instanceof HTMLElement)) return
      if (!target.matches(FOCUSABLE_SELECTOR)) return

      const run = () => {
        try {
          target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
        } catch {
          target.scrollIntoView(true)
        }
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(run)
      })
    }

    const onFocusIn = (event) => {
      scrollFocusedField(event.target)
    }

    const onViewportUpdate = () => {
      const active = document.activeElement
      if (active && container.contains(active)) {
        scrollFocusedField(active)
      }
    }

    container.addEventListener('focusin', onFocusIn)
    window.addEventListener('viewport-update', onViewportUpdate)

    return () => {
      container.removeEventListener('focusin', onFocusIn)
      window.removeEventListener('viewport-update', onViewportUpdate)
    }
  }, [containerRef])
}
