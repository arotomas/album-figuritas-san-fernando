/** Congela rotación del mapPane durante y tras drag manual del usuario. */
export const MAP_ROTATION_DRAG_FREEZE_MS = 10_000

let freezeUntilMs = 0
let expiryTimer = null
const listeners = new Set()

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // ignore
    }
  })
}

export function registerMapRotationDragFreeze() {
  freezeUntilMs = Date.now() + MAP_ROTATION_DRAG_FREEZE_MS
  notifyListeners()

  if (expiryTimer) clearTimeout(expiryTimer)
  expiryTimer = setTimeout(() => {
    expiryTimer = null
    freezeUntilMs = 0
    notifyListeners()
  }, MAP_ROTATION_DRAG_FREEZE_MS)
}

export function isMapRotationDragFrozen() {
  return Date.now() < freezeUntilMs
}

export function subscribeMapRotationDragFreeze(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
