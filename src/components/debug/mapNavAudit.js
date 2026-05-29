const NAV_AUDIT_KEY = 'album-map-nav-audit'

export function recordMapNavStep(label, { pathname = '', search = '' } = {}) {
  if (typeof window === 'undefined') return

  try {
    const prev = JSON.parse(sessionStorage.getItem(NAV_AUDIT_KEY) || '[]')
    prev.push({
      t: new Date().toISOString(),
      label,
      pathname,
      search,
      href: window.location.href,
      origin: window.location.origin,
    })
    sessionStorage.setItem(NAV_AUDIT_KEY, JSON.stringify(prev.slice(-12)))
  } catch {
    // ignore
  }
}

export function readMapNavAuditTrail() {
  if (typeof window === 'undefined') return []

  try {
    return JSON.parse(sessionStorage.getItem(NAV_AUDIT_KEY) || '[]')
  } catch {
    return []
  }
}
