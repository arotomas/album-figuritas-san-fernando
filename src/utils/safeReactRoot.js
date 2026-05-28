/** Desmonta un root de createRoot sin propagar errores de doble unmount (React 19). */
export function safeUnmountRoot(root) {
  if (!root) return
  try {
    root.unmount()
  } catch {
    // Root ya desmontado o contenedor removido por Leaflet.
  }
}
