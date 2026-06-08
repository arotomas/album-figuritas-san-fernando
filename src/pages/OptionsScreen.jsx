import { useState } from 'react'
import { Button } from '../components/Button'
import { LegalNotice } from '../components/legal/LegalNotice'
import { InstallAppSection } from '../components/profile/InstallAppSection'
import { OptionsAlbumSection } from '../components/profile/OptionsAlbumSection'
import { OptionsSoundSection } from '../components/profile/OptionsSoundSection'
import { OptionsSuperAdminToolsSection } from '../components/profile/OptionsSuperAdminToolsSection'
import { PlayerRankingSection } from '../components/profile/PlayerRankingSection'
import { ProfileOptionsSection } from '../components/profile/ProfileOptionsSection'
import { PushNotificationsSection } from '../components/push/PushNotificationsSection'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../store/useAppStore'
import { isSuperAdminProfile } from '../utils/roles'

export function OptionsScreen() {
  const { logout } = useAuth()
  const supabaseProfile = useAppStore((state) => state.supabaseProfile)
  const resetUserProgress = useAppStore((state) => state.resetUserProgress)
  const lastSupabaseSyncWarning = useAppStore((state) => state.lastSupabaseSyncWarning)
  const [resetPhase, setResetPhase] = useState('idle')
  const [resetError, setResetError] = useState(null)

  const isSuperAdmin = isSuperAdminProfile(supabaseProfile)

  const handleResetRequest = () => {
    setResetError(null)
    setResetPhase('confirm')
  }

  const handleResetCancel = () => {
    setResetPhase('idle')
    setResetError(null)
  }

  const handleResetConfirm = async () => {
    setResetPhase('loading')
    setResetError(null)

    const result = await resetUserProgress()

    if (result.ok) {
      setResetPhase('done')
      return
    }

    setResetPhase('error')
    setResetError(
      result.reason === 'SUPABASE_NOT_READY' || result.reason === 'REMOTE_RESET_SKIPPED'
        ? 'Tu sesión aún no está lista. Esperá unos segundos y probá de nuevo.'
        : result.reason === 'REMOTE_RESET_FAILED' || result.reason?.includes('policy')
          ? 'No pudimos borrar tu progreso en el servidor. Probá de nuevo en unos segundos.'
          : 'No pudimos reiniciar tu progreso. Probá de nuevo.',
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-warm-white">
      <PlayerRankingSection />

      <div className="space-y-6 px-6 py-6 shrink-0">
        <ProfileOptionsSection />

        <PushNotificationsSection />

        <OptionsAlbumSection />

        <OptionsSoundSection />

        <InstallAppSection />

        {isSuperAdmin ? <OptionsSuperAdminToolsSection /> : null}

        {lastSupabaseSyncWarning ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
              Advertencia Supabase
            </p>
            <p className="mt-1 text-xs text-amber-950">{lastSupabaseSyncWarning}</p>
          </div>
        ) : null}

        <div className="space-y-3 pb-2 pt-2">
          {resetPhase === 'done' ? (
            <div
              className="rounded-2xl border border-progress/30 bg-progress/10 px-4 py-4 text-center"
              role="status"
              aria-live="polite"
            >
              <p className="text-sm font-bold text-progress">Tu progreso fue reiniciado</p>
              <p className="mt-1 text-xs text-muted">
                El álbum quedó vacío. ¡A explorar de nuevo!
              </p>
              <Button
                variant="ghost"
                className="mt-3"
                uiSound="UI_CONFIRM"
                onClick={handleResetCancel}
              >
                Entendido
              </Button>
            </div>
          ) : resetPhase === 'confirm' ? (
            <div className="rounded-2xl border border-red-300/40 bg-red-50 px-4 py-4">
              <p className="text-sm font-bold text-red-900">¿Reiniciar todo tu progreso?</p>
              <p className="mt-2 text-xs leading-5 text-red-800/80">
                Se borrarán figuritas obtenidas, fotos, descubrimientos y recompensas. Esta acción
                no se puede deshacer.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Button variant="outline" uiSound="UI_CONFIRM" onClick={handleResetConfirm}>
                  Sí, reiniciar todo
                </Button>
                <Button variant="ghost" uiSound="UI_CLOSE" onClick={handleResetCancel}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button
                variant="outline"
                uiSound="UI_CLICK"
                disabled={resetPhase === 'loading'}
                onClick={handleResetRequest}
              >
                {resetPhase === 'loading' ? 'Reiniciando progreso…' : 'Reiniciar progreso'}
              </Button>
              {resetPhase === 'error' && resetError ? (
                <p className="text-center text-xs text-red-600" role="alert">
                  {resetError}
                </p>
              ) : null}
            </>
          )}
          <Button variant="ghost" uiSound="UI_CLICK" onClick={logout}>
            Cerrar sesión
          </Button>
          <LegalNotice className="pt-4" />
        </div>
      </div>
    </div>
  )
}
