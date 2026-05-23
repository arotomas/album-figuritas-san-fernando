import { useEffect, useState } from 'react'
import { getSessionUserId } from '../services/supabase/auth'
import { isAdmin } from '../services/supabase/admin'
import { adminLog } from '../utils/adminLog'

export function AdminRoute({ children }) {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let cancelled = false

    async function checkAdmin() {
      try {
        const userId = await getSessionUserId()
        const allowed = await isAdmin(userId)
        if (cancelled) return

        if (!allowed) {
          adminLog.warn('permission denied', { userId })
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
  }, [])

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
            Esta sección está disponible solo para administradores.
          </p>
        </div>
      </div>
    )
  }

  return children
}
