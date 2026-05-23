import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { isQaMode, withQaParam } from '../utils/qaMode'

export function useAuth() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAppStore((state) => state.login)
  const logout = useAppStore((state) => state.logout)
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)
  const user = useAppStore((state) => state.user)

  const handleLogin = useCallback(
    (credentials) => {
      login(credentials)
      navigate(withQaParam('/map', isQaMode(location.search)), { replace: true })
    },
    [location.search, login, navigate],
  )

  const handleLogout = useCallback(() => {
    logout()
    navigate(withQaParam('/login', isQaMode(location.search)), { replace: true })
  }, [location.search, logout, navigate])

  return {
    isAuthenticated,
    user,
    login: handleLogin,
    logout: handleLogout,
  }
}
