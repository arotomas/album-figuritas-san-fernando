const DISMISS_MS = 300
const FALLBACK_REMOVE_MS = 450

/** Oculta el splash estático de index.html con fade-out (idempotente). */
export function dismissStaticSplash() {
  const el = document.getElementById('static-splash')
  if (!el || el.dataset.dismissed === 'true') return
  el.dataset.dismissed = 'true'
  el.setAttribute('aria-busy', 'false')

  const remove = () => {
    el.remove()
  }

  el.classList.add('is-dismissed')
  el.addEventListener('transitionend', remove, { once: true })
  window.setTimeout(remove, FALLBACK_REMOVE_MS)
}

/** Fallback por si React no monta — evita splash colgada. */
export function scheduleStaticSplashFallback(timeoutMs = 20_000) {
  window.setTimeout(() => {
    dismissStaticSplash()
  }, timeoutMs)
}

export { DISMISS_MS }
