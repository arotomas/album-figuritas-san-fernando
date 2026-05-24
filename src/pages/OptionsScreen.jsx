import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { AddressAutocomplete } from '../components/profile/AddressAutocomplete'
import { useAuth } from '../hooks/useAuth'
import { useAppStore, ALBUM_STATUS } from '../store/useAppStore'
import { getMainProgressState } from '../utils/figureGameRules'
import { getCurrentPosition } from '../services/geoService'
import { GPS_HIGH_ACCURACY_OPTIONS } from '../config/gps'
import { isDevMode } from '../utils/devMode'
import { useQaMode, withQaParam } from '../utils/qaMode'
import { getFullName } from '../utils/profileValidation'
import { hasValidAddress } from '../utils/parseGooglePlace'
import { LegalNotice } from '../components/legal/LegalNotice'

const STATUS_LABELS = {
  [ALBUM_STATUS.EN_PROGRESO]: 'En progreso',
  [ALBUM_STATUS.COMPLETADO]: 'Álbum completado',
  [ALBUM_STATUS.EN_REVISION]: 'En revisión',
}

export function OptionsScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, updateProfile, supabaseProfile, isSubmitting } = useAuth()
  const resetProgress = useAppStore((state) => state.resetProgress)
  const setQaTestFigureNear = useAppStore((state) => state.setQaTestFigureNear)
  const clearQaTestFigure = useAppStore((state) => state.clearQaTestFigure)
  const qaTestFigure = useAppStore((state) => state.qaTestFigure)
  const albumStatus = useAppStore((state) => state.albumStatus)
  const lastSavedAt = useAppStore((state) => state.lastSavedAt)
  const supabaseReady = useAppStore((state) => state.supabaseReady)
  const supabaseUsername = useAppStore((state) => state.supabaseUsername)
  const lastSupabaseSyncWarning = useAppStore((state) => state.lastSupabaseSyncWarning)
  const figures = useAppStore((state) => state.figures)
  const mainProgress = getMainProgressState(figures)
  const [qaMessage, setQaMessage] = useState(null)
  const [qaLoading, setQaLoading] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    nombre: '',
    apellido: '',
    celular: '',
    username: '',
    email: '',
  })
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [profileMessage, setProfileMessage] = useState(null)
  const [profileError, setProfileError] = useState(null)

  const { isQaActive: qaEnabled, withQa } = useQaMode()
  const devEnabled = isDevMode()

  useEffect(() => {
    console.log('[QA options]', {
      search: window.location.search,
      qa: qaEnabled,
    })
  }, [location.search, location.pathname, qaEnabled])

  useEffect(() => {
    if (!supabaseProfile) return
    setProfileForm({
      nombre: supabaseProfile.nombre ?? '',
      apellido: supabaseProfile.apellido ?? '',
      celular: supabaseProfile.celular ?? '',
      username: supabaseProfile.username ?? '',
      email: supabaseProfile.email ?? '',
    })
    if (supabaseProfile.direccion_texto) {
      setSelectedAddress({
        direccion_texto: supabaseProfile.direccion_texto,
        direccion_lat: supabaseProfile.direccion_lat,
        direccion_lng: supabaseProfile.direccion_lng,
        localidad: supabaseProfile.localidad,
        provincia: supabaseProfile.provincia,
        pais: supabaseProfile.pais,
        codigo_postal: supabaseProfile.codigo_postal,
      })
    }
  }, [supabaseProfile])

  const handleSaveProfile = async () => {
    setProfileError(null)
    setProfileMessage(null)

    const address = hasValidAddress(selectedAddress) ? selectedAddress : supabaseProfile
    const result = await updateProfile({ form: profileForm, address })

    if (!result.ok) {
      setProfileError(result.message)
      return
    }

    setProfileMessage('Perfil actualizado.')
    setEditingProfile(false)
  }

  const handleCreateQaFigure = async () => {
    setQaMessage(null)
    setQaLoading(true)

    try {
      const geo = await getCurrentPosition(GPS_HIGH_ACCURACY_OPTIONS)
      const ok = setQaTestFigureNear(
        geo.coords.latitude,
        geo.coords.longitude,
      )

      if (!ok) {
        setQaMessage('No hay figuritas pendientes para probar o el modo QA no está activo.')
        return
      }

      setQaMessage('Figurita QA creada a ~5–10m. Andá al mapa.')
      navigate(withQa('/map'))
    } catch {
      setQaMessage('No pudimos obtener tu ubicación. Revisá permisos GPS.')
    } finally {
      setQaLoading(false)
    }
  }

  const handleClearQaFigure = () => {
    clearQaTestFigure()
    setQaMessage('Figurita QA eliminada.')
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-warm-white px-6 py-6">
      <h1 className="text-xl font-bold text-ink">Opciones</h1>
      <p className="mt-1 text-sm text-muted">Configuración de la app</p>

      {qaEnabled && (
        <p className="mt-4 rounded-lg border border-cyan-500 bg-cyan-100 px-3 py-2 text-center text-sm font-bold uppercase tracking-wide text-cyan-900">
          QA ENABLED
        </p>
      )}

      <div className="mt-8 space-y-4 rounded-2xl border border-border bg-surface p-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Perfil</p>
          <p className="mt-1 text-lg font-semibold text-ink">
            {getFullName(supabaseProfile) || supabaseUsername || user?.username || 'Explorador'}
          </p>
          <p className="mt-0.5 text-sm text-muted">@{supabaseProfile?.username ?? supabaseUsername ?? 'sin-apodo'}</p>
        </div>

        {!editingProfile ? (
          <div className="space-y-3 text-sm">
            <p><span className="text-muted">Email:</span> {supabaseProfile?.email ?? '-'}</p>
            <p><span className="text-muted">Celular:</span> {supabaseProfile?.celular ?? '-'}</p>
            <p><span className="text-muted">DNI:</span> {supabaseProfile?.dni ?? '-'}</p>
            <p><span className="text-muted">Dirección:</span> {supabaseProfile?.direccion_texto ?? '-'}</p>
            <p><span className="text-muted">Login:</span> {supabaseProfile?.auth_provider ?? 'email'}</p>
            <Button variant="outline" onClick={() => setEditingProfile(true)}>
              Editar perfil
            </Button>
          </div>
        ) : (
          <div className="space-y-3 overflow-visible">
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="edit-nombre"
                label="Nombre"
                value={profileForm.nombre}
                onChange={(event) => setProfileForm((c) => ({ ...c, nombre: event.target.value }))}
              />
              <Input
                id="edit-apellido"
                label="Apellido"
                value={profileForm.apellido}
                onChange={(event) => setProfileForm((c) => ({ ...c, apellido: event.target.value }))}
              />
            </div>
            <Input
              id="edit-celular"
              label="Celular"
              value={profileForm.celular}
              onChange={(event) => setProfileForm((c) => ({ ...c, celular: event.target.value }))}
            />
            <Input
              id="edit-username"
              label="Username"
              value={profileForm.username}
              onChange={(event) => setProfileForm((c) => ({ ...c, username: event.target.value }))}
            />
            <Input id="edit-email" label="Email" value={profileForm.email} readOnly />
            <p className="text-xs text-muted">El DNI no se puede modificar desde acá.</p>
            <AddressAutocomplete
              value={selectedAddress?.direccion_texto ?? supabaseProfile?.direccion_texto ?? ''}
              onAddressSelect={setSelectedAddress}
              label="Dirección"
            />
            {profileError && <p className="text-xs font-medium text-red-600">{profileError}</p>}
            {profileMessage && <p className="text-xs font-medium text-progress">{profileMessage}</p>}
            <div className="flex gap-2">
              <Button disabled={isSubmitting} onClick={handleSaveProfile}>
                {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
              </Button>
              <Button variant="ghost" onClick={() => setEditingProfile(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Álbum</p>
          <p className="mt-1 text-sm font-medium text-ink">
            {STATUS_LABELS[albumStatus]}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Progreso: {mainProgress.obtained}/{mainProgress.visibleTotal}
          </p>
          {lastSavedAt && (
            <p className="mt-0.5 text-xs text-muted">
              Guardado: {new Date(lastSavedAt).toLocaleString('es-AR')}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Almacenamiento</p>
          <p className="mt-1 text-sm text-ink">Local (localStorage)</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Backend</p>
          <p className="mt-1 text-sm text-ink">
            {supabaseReady ? 'Supabase conectado' : 'Supabase sin sesión activa'}
          </p>
        </div>

        {lastSupabaseSyncWarning && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
              Advertencia Supabase
            </p>
            <p className="mt-1 text-xs text-amber-950">{lastSupabaseSyncWarning}</p>
          </div>
        )}
      </div>

      {qaEnabled && (
        <div className="mt-6 space-y-3 rounded-2xl border border-cyan-400/40 bg-cyan-50 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-cyan-900">
            Modo QA temporal
          </p>
          <p className="text-sm text-cyan-950/80">
            Crea una figurita temporal a 5–10m de tu ubicación. Flujo real:
            proximidad → cámara → foto → desbloqueo. Solo memoria — no backend.
          </p>
          {qaTestFigure && (
            <p className="text-xs text-cyan-900">Activa: {qaTestFigure.nombre}</p>
          )}
          {qaMessage && (
            <p className="text-xs text-cyan-950">{qaMessage}</p>
          )}
          <Button
            variant="outline"
            disabled={qaLoading}
            onClick={handleCreateQaFigure}
          >
            {qaLoading ? 'Obteniendo ubicación…' : 'Crear figurita de prueba cerca mío'}
          </Button>
          {qaTestFigure && (
            <Button variant="ghost" onClick={handleClearQaFigure}>
              Eliminar figurita QA
            </Button>
          )}
        </div>
      )}

      {devEnabled && !qaEnabled && (
        <div className="mt-6 space-y-3 rounded-2xl border border-amber-400/30 bg-amber-50 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
            Modo prueba (dev)
          </p>
          <p className="text-sm text-amber-900/80">
            Mismas herramientas QA disponibles en entorno de desarrollo.
          </p>
          {qaTestFigure && (
            <p className="text-xs text-amber-800">Activa: {qaTestFigure.nombre}</p>
          )}
          {qaMessage && <p className="text-xs text-amber-900">{qaMessage}</p>}
          <Button
            variant="outline"
            disabled={qaLoading}
            onClick={handleCreateQaFigure}
          >
            {qaLoading ? 'Obteniendo ubicación…' : 'Crear figurita de prueba cerca mío'}
          </Button>
          {qaTestFigure && (
            <Button variant="ghost" onClick={handleClearQaFigure}>
              Eliminar figurita QA
            </Button>
          )}
        </div>
      )}

      <div className="mt-auto space-y-3 pb-2 pt-8">
        <Button variant="outline" onClick={resetProgress}>
          Reiniciar progreso
        </Button>
        <Button variant="ghost" onClick={logout}>
          Cerrar sesión
        </Button>
        <LegalNotice className="pt-4" />
      </div>
    </div>
  )
}
