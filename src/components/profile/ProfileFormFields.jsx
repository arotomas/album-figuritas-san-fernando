import { Input } from '../Input'
import { AddressAutocomplete } from './AddressAutocomplete'

export function ProfileFormFields({
  form,
  fieldErrors = {},
  onChange,
  onAddressSelect,
  selectedAddress,
  showEmail = false,
  emailReadOnly = false,
  showPassword = false,
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input
          id="nombre"
          label="Nombre"
          value={form.nombre}
          onChange={(event) => onChange('nombre', event.target.value)}
          placeholder="Tu nombre"
          autoComplete="given-name"
        />
        <Input
          id="apellido"
          label="Apellido"
          value={form.apellido}
          onChange={(event) => onChange('apellido', event.target.value)}
          placeholder="Tu apellido"
          autoComplete="family-name"
        />
      </div>
      {fieldErrors.nombre && <p className="text-xs font-medium text-red-600">{fieldErrors.nombre}</p>}
      {fieldErrors.apellido && (
        <p className="text-xs font-medium text-red-600">{fieldErrors.apellido}</p>
      )}

      <Input
        id="dni"
        label="DNI"
        value={form.dni}
        onChange={(event) => onChange('dni', event.target.value)}
        placeholder="12345678"
        inputMode="numeric"
        autoComplete="off"
      />
      {fieldErrors.dni && <p className="text-xs font-medium text-red-600">{fieldErrors.dni}</p>}

      {showEmail && (
        <>
          <Input
            id="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(event) => onChange('email', event.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
            readOnly={emailReadOnly}
            className={emailReadOnly ? '[&_input]:bg-slate-50' : ''}
          />
          {fieldErrors.email && (
            <p className="text-xs font-medium text-red-600">{fieldErrors.email}</p>
          )}
        </>
      )}

      <Input
        id="celular"
        label="Celular"
        value={form.celular}
        onChange={(event) => onChange('celular', event.target.value)}
        placeholder="11 1234 5678"
        inputMode="tel"
        autoComplete="tel"
      />
      {fieldErrors.celular && (
        <p className="text-xs font-medium text-red-600">{fieldErrors.celular}</p>
      )}

      <AddressAutocomplete
        value={selectedAddress?.direccion_texto ?? form.direccion_texto ?? ''}
        onAddressSelect={onAddressSelect}
        required
        helperText="Tu dirección no será pública. Elegí una sugerencia real de Zona Norte."
      />
      {fieldErrors.address && (
        <p className="text-xs font-medium text-red-600">{fieldErrors.address}</p>
      )}

      <Input
        id="username"
        label="Username / apodo visible"
        value={form.username}
        onChange={(event) => onChange('username', event.target.value)}
        placeholder="Ej: TotoExplora"
        autoComplete="nickname"
        maxLength={32}
      />
      {fieldErrors.username && (
        <p className="text-xs font-medium text-red-600">{fieldErrors.username}</p>
      )}

      {showPassword && (
        <>
          <Input
            id="password"
            label="Contraseña"
            type="password"
            value={form.password}
            onChange={(event) => onChange('password', event.target.value)}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
          />
          {fieldErrors.password && (
            <p className="text-xs font-medium text-red-600">{fieldErrors.password}</p>
          )}

          <Input
            id="confirmPassword"
            label="Repetir contraseña"
            type="password"
            value={form.confirmPassword}
            onChange={(event) => onChange('confirmPassword', event.target.value)}
            placeholder="Repetí tu contraseña"
            autoComplete="new-password"
          />
          {fieldErrors.confirmPassword && (
            <p className="text-xs font-medium text-red-600">{fieldErrors.confirmPassword}</p>
          )}
        </>
      )}
    </div>
  )
}
