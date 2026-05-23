import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getSessionUserId } from '../services/supabase/auth'
import { getProfileAccess } from '../services/supabase/admin'
import { hasMinimumRole } from '../utils/roles'
import { adminLog } from '../utils/adminLog'

export function AdminRoute({ children, minRole = 'moderator' }) {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let cancelled = false

    async function checkAdmin() {
      try {
        const userId = await getSessionUserId()
        const nextAccess = await getProfileAccess(userId)
        if (cancelled) return

        if (!hasMinimumRole(nextAccess.profile, minRole)) {
          adminLog.warn('permission denied', { userId, minRole, role: nextAccess.role })
          setStatus('denied')
          return
        }

        setStatus('allowed')
      } catch (error) {
        adminLog.warn('permission denied', { message: error?.message ?? String(error) })
        if (!cancelled) setStatus('denied')
      }
    }

    void checkAdmin()

    return () => {
      cancelled = true
    }
  }, [minRole])

  if (status === 'checking') {
    return (
      <div className="flex h-full items-center justify-center bg-warm-white px-6 text-center">
        <p className="text-sm font-medium text-muted">Verificando permisos…</p>
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="flex h-full items-center justify-center bg-warm-white px-6 text-center">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h1 className="text-xl font-bold text-ink">No tenés permisos</h1>
          <p className="mt-2 text-sm text-muted">
            Esta sección está disponible solo para el equipo de administración.
          </p>
        </div>
      </div>
    )
  }

  return children
}

export function AdminRoleGate({ children, minRole = 'admin', fallbackTo = '/admin/players' }) {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let cancelled = false

    async function checkRole() {
      try {
        const userId = await getSessionUserId()
        const access = await getProfileAccess(userId)
        if (cancelled) return

        if (!hasMinimumRole(access.profile, minRole)) {
          setStatus('redirect')
          return
        }

        setStatus('allowed')
      } catch {
        if (!cancelled) setStatus('redirect')
      }
    }

    void checkRole()

    return () => {
      cancelled = true
    }
  }, [minRole])

  if (status === 'checking') {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <p className="text-sm font-medium text-muted">Verificando permisos…</p>
      </div>
    )
  }

  if (status === 'redirect') {
    return <Navigate to={fallbackTo} replace />
  }

  return children
}
