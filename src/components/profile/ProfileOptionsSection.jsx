import { useEffect, useState } from 'react'
import { Button } from '../Button'
import { Input } from '../Input'
import { AddressAutocomplete } from './AddressAutocomplete'
import { useAuth } from '../../hooks/useAuth'
import { useAppStore } from '../../store/useAppStore'
import { getFullName } from '../../utils/profileValidation'
import { hasValidAddress } from '../../utils/parseGooglePlace'
import { OptionsSectionCard } from './OptionsSectionCard'

export function ProfileOptionsSection() {
  const { user, updateProfile, supabaseProfile, isSubmitting } = useAuth()
  const supabaseUsername = useAppStore((state) => state.supabaseUsername)
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

  const displayName =
    getFullName(supabaseProfile) || supabaseUsername || user?.username || 'Explorador'
  const username = supabaseProfile?.username ?? supabaseUsername ?? 'sin-apodo'

  return (
    <OptionsSectionCard title="Mi perfil">
      <div className="mt-4">
        <p className="text-xl font-bold text-ink">{displayName}</p>
        <p className="mt-0.5 text-sm text-muted">@{username}</p>
      </div>

      {!editingProfile ? (
        <div className="mt-4 space-y-2.5 text-sm">
          <p>
            <span className="text-muted">Email:</span> {supabaseProfile?.email ?? '-'}
          </p>
          <p>
            <span className="text-muted">Celular:</span> {supabaseProfile?.celular ?? '-'}
          </p>
          <p>
            <span className="text-muted">DNI:</span> {supabaseProfile?.dni ?? '-'}
          </p>
          <p>
            <span className="text-muted">Dirección:</span> {supabaseProfile?.direccion_texto ?? '-'}
          </p>
          <Button variant="outline" className="mt-2" onClick={() => setEditingProfile(true)}>
            Editar perfil
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3 overflow-visible">
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
          <div className="flex flex-wrap gap-2">
            <Button disabled={isSubmitting} onClick={handleSaveProfile}>
              {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
            </Button>
            <Button variant="ghost" onClick={() => setEditingProfile(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </OptionsSectionCard>
  )
}
