import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { AddressAutocomplete } from '../components/profile/AddressAutocomplete'
import { AuthDebugPanel } from '../components/debug/AuthDebugPanel'
import { useAuth } from '../hooks/useAuth'
import { useAppStore, ALBUM_STATUS } from '../store/useAppStore'
import { getMainProgressState } from '../utils/figureGameRules'
import { getCurrentPosition } from '../services/geoService'
import { GPS_HIGH_ACCURACY_OPTIONS } from '../config/gps'
import { isDevMode } from '../utils/devMode'
import { useQaMode, withQaParam } from '../utils/qaMode'
import { fetchProfileWithAddress, updateProfileAddress } from '../services/supabase/profile'
import { hasValidAddress } from '../utils/parseGooglePlace'

const STATUS_LABELS = {
  [ALBUM_STATUS.EN_PROGRESO]: 'En progreso',
  [ALBUM_STATUS.COMPLETADO]: 'Álbum completado',
  [ALBUM_STATUS.EN_REVISION]: 'En revisión',
}

export function OptionsScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const resetProgress = useAppStore((state) => state.resetProgress)
  const setQaTestFigureNear = useAppStore((state) => state.setQaTestFigureNear)
  const clearQaTestFigure = useAppStore((state) => state.clearQaTestFigure)
  const qaTestFigure = useAppStore((state) => state.qaTestFigure)
  const albumStatus = useAppStore((state) => state.albumStatus)
  const lastSavedAt = useAppStore((state) => state.lastSavedAt)
  const supabaseReady = useAppStore((state) => state.supabaseReady)
  const supabaseUsername = useAppStore((state) => state.supabaseUsername)
  const supabaseUserId = useAppStore((state) => state.supabaseUserId)
  const setSupabaseAuth = useAppStore((state) => state.setSupabaseAuth)
  const isSupabaseAdmin = useAppStore((state) => state.isSupabaseAdmin)
  const supabaseProfileAddress = useAppStore((state) => state.supabaseProfileAddress)
  const supabaseProfileLocalidad = useAppStore((state) => state.supabaseProfileLocalidad)
  const lastSupabaseSyncWarning = useAppStore((state) => state.lastSupabaseSyncWarning)
  const figures = useAppStore((state) => state.figures)
  const mainProgress = getMainProgressState(figures)
  const [qaMessage, setQaMessage] = useState(null)
  const [qaLoading, setQaLoading] = useState(false)
  const [profileAddress, setProfileAddress] = useState(null)
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [addressSaving, setAddressSaving] = useState(false)
  const [addressMessage, setAddressMessage] = useState(null)
  const [addressError, setAddressError] = useState(null)

  const { isQaActive: qaEnabled, withQa } = useQaMode()
  const devEnabled = isDevMode()

  useEffect(() => {
    console.log('[QA options]', {
      search: window.location.search,
      qa: qaEnabled,
    })
  }, [location.search, location.pathname, qaEnabled])

  useEffect(() => {
    if (!supabaseUserId) return

    let cancelled = false
    fetchProfileWithAddress(supabaseUserId)
      .then((profile) => {
        if (cancelled || !profile) return
        setProfileAddress(profile)
        setSupabaseAuth({
          userId: supabaseUserId,
          isAdmin: isSupabaseAdmin,
          profile,
        })
      })
      .catch(() => {
        if (cancelled) return
        setProfileAddress({
          direccion_texto: supabaseProfileAddress,
          localidad: supabaseProfileLocalidad,
        })
      })

    return () => {
      cancelled = true
    }
  }, [
    isSupabaseAdmin,
    setSupabaseAuth,
    supabaseProfileAddress,
    supabaseProfileLocalidad,
    supabaseUserId,
  ])

  const handleSaveAddress = async () => {
    if (!supabaseUserId || !hasValidAddress(selectedAddress)) {
      setAddressError('Elegí una dirección de la lista de sugerencias.')
      return
    }

    setAddressSaving(true)
    setAddressError(null)
    setAddressMessage(null)

    try {
      const profile = await updateProfileAddress(supabaseUserId, selectedAddress)
      setProfileAddress(profile)
      setSelectedAddress(null)
      setSupabaseAuth({
        userId: supabaseUserId,
        isAdmin: isSupabaseAdmin,
        profile,
      })
      setAddressMessage('Dirección actualizada.')
    } catch (saveError) {
      setAddressError(saveError?.message ?? 'No pudimos guardar tu dirección.')
    } finally {
      setAddressSaving(false)
    }
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
          <p className="text-xs uppercase tracking-wide text-muted">Usuario</p>
          <p className="mt-1 font-medium text-ink">
            {supabaseUsername || user?.username || user?.displayName || 'Explorador'}
          </p>
        </div>

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

        <div className="rounded-2xl border border-progress/25 bg-progress/10 p-4 overflow-visible">
          <p className="text-xs font-black uppercase tracking-wide text-muted">Tu domicilio</p>
          <p className="mt-1 text-sm text-muted">
            Solo vos podés ver esto. Nos ayuda a entender la zona de participantes.
          </p>
          {profileAddress?.direccion_texto ? (
            <div className="mt-3 rounded-xl border border-border bg-white p-3">
              <p className="text-sm font-semibold text-ink">{profileAddress.direccion_texto}</p>
              {profileAddress.localidad && (
                <p className="mt-1 text-xs text-muted">
                  {profileAddress.localidad}
                  {profileAddress.provincia ? `, ${profileAddress.provincia}` : ''}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Todavía no cargaste tu dirección.</p>
          )}

          <div className="mt-4">
            <AddressAutocomplete
              key={profileAddress?.direccion_texto ?? 'empty-address'}
              value={selectedAddress?.direccion_texto ?? ''}
              onAddressSelect={setSelectedAddress}
              label={profileAddress?.direccion_texto ? 'Actualizar dirección' : 'Agregar dirección'}
              helperText="Buscá calles y barrios de Zona Norte. Elegí una sugerencia."
            />
          </div>

          {addressError && <p className="mt-2 text-xs font-medium text-red-600">{addressError}</p>}
          {addressMessage && <p className="mt-2 text-xs font-medium text-progress">{addressMessage}</p>}

          <Button
            className="mt-4 w-full"
            disabled={addressSaving || !hasValidAddress(selectedAddress)}
            onClick={handleSaveAddress}
          >
            {addressSaving ? 'Guardando…' : 'Guardar dirección'}
          </Button>
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

      <AuthDebugPanel className="mt-6" />

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
      </div>
    </div>
  )
}
