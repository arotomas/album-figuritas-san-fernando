import { Navigate, useLocation } from 'react-router-dom'

/**
 * Rutas desconocidas dentro de /admin no deben pasar por /login:
 * un usuario autenticado termina redirigido a /map y parece que "salió del admin".
 */
export function NotFoundRedirect() {
  const location = useLocation()

  if (location.pathname.startsWith('/admin')) {
    return <Navigate to="/admin/players" replace />
  }

  return <Navigate to={`/login${location.search}`} replace />
}
