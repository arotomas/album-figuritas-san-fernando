import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ADMIN_HOME_PATH } from '../utils/postAuthRedirect'

/**
 * Si el usuario usa «Atrás» y sale de /admin, volvemos al panel sin montar /map
 * (evita crashes de Leaflet + createRoot y el error global «Algo salió mal»).
 */
export function useAdminHistoryGuard() {
  const navigate = useNavigate()

  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname
      if (path.startsWith('/admin')) return

      if (window.history.length > 1) {
        window.history.forward()
      }

      navigate(`${ADMIN_HOME_PATH}${window.location.search}`, { replace: true })
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [navigate])
}
