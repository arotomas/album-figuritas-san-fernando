import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

export function useAuth() {
  const navigate = useNavigate()
  const login = useAppStore((state) => state.login)
  const logout = useAppStore((state) => state.logout)
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)
  const user = useAppStore((state) => state.user)

  const handleLogin = useCallback(
    (credentials) => {
      login(credentials)
      navigate('/map', { replace: true })
    },
    [login, navigate],
  )

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  return {
    isAuthenticated,
    user,
    login: handleLogin,
    logout: handleLogout,
  }
}
