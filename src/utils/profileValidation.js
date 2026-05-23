const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeDni(value) {
  return String(value ?? '').replace(/\D/g, '')
}

export function normalizePhone(value) {
  return String(value ?? '').replace(/[^\d+]/g, '')
}

export function validateEmail(email) {
  const trimmed = email?.trim()
  if (!trimmed) return 'El email es obligatorio.'
  if (!EMAIL_PATTERN.test(trimmed)) return 'Ingresá un email válido.'
  return null
}

export function validatePassword(password) {
  if (!password) return 'La contraseña es obligatoria.'
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  return null
}

export function validatePasswordMatch(password, confirmPassword) {
  if (!confirmPassword) return 'Repetí la contraseña.'
  if (password !== confirmPassword) return 'Las contraseñas no coinciden.'
  return null
}

export function validateRequiredText(value, label) {
  if (!value?.trim()) return `${label} es obligatorio.`
  return null
}

export function validateDni(dni) {
  const normalized = normalizeDni(dni)
  if (!normalized) return 'El DNI es obligatorio.'
  if (normalized.length < 7 || normalized.length > 8) {
    return 'El DNI debe tener 7 u 8 dígitos.'
  }
  return null
}

export function validateCelular(celular) {
  const normalized = normalizePhone(celular)
  if (!normalized) return 'El celular es obligatorio.'
  if (normalized.replace(/\D/g, '').length < 8) {
    return 'Ingresá un celular válido.'
  }
  return null
}

export function validateUsername(username) {
  const trimmed = username?.trim()
  if (!trimmed) return 'El username o apodo es obligatorio.'
  if (trimmed.length < 3) return 'El username debe tener al menos 3 caracteres.'
  if (trimmed.length > 32) return 'El username no puede superar 32 caracteres.'
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return 'Usá solo letras, números, punto, guión o guión bajo.'
  }
  return null
}

export function computeProfileCompleted(profile) {
  return Boolean(
    profile?.nombre?.trim() &&
      profile?.apellido?.trim() &&
      normalizeDni(profile?.dni) &&
      profile?.celular?.trim() &&
      profile?.username?.trim() &&
      profile?.direccion_texto?.trim() &&
      profile?.direccion_lat != null &&
      profile?.direccion_lng != null,
  )
}

export function isProfileComplete(profile) {
  if (!profile) return false
  return profile.profile_completed === true && computeProfileCompleted(profile)
}

export function getFullName(profile) {
  return [profile?.nombre, profile?.apellido].filter(Boolean).join(' ').trim()
}

export function validateRegistrationForm(form, address) {
  const errors = {}

  const nombre = validateRequiredText(form.nombre, 'El nombre')
  if (nombre) errors.nombre = nombre

  const apellido = validateRequiredText(form.apellido, 'El apellido')
  if (apellido) errors.apellido = apellido

  const dni = validateDni(form.dni)
  if (dni) errors.dni = dni

  const email = validateEmail(form.email)
  if (email) errors.email = email

  const celular = validateCelular(form.celular)
  if (celular) errors.celular = celular

  const username = validateUsername(form.username)
  if (username) errors.username = username

  const password = validatePassword(form.password)
  if (password) errors.password = password

  const confirmPassword = validatePasswordMatch(form.password, form.confirmPassword)
  if (confirmPassword) errors.confirmPassword = confirmPassword

  if (!address?.direccion_texto?.trim() || address?.direccion_lat == null) {
    errors.address = 'Elegí tu dirección de la lista de sugerencias.'
  }

  return errors
}

export function validateProfileSetupForm(form, address, { requireEmail = false } = {}) {
  const errors = {}

  const nombre = validateRequiredText(form.nombre, 'El nombre')
  if (nombre) errors.nombre = nombre

  const apellido = validateRequiredText(form.apellido, 'El apellido')
  if (apellido) errors.apellido = apellido

  const dni = validateDni(form.dni)
  if (dni) errors.dni = dni

  const celular = validateCelular(form.celular)
  if (celular) errors.celular = celular

  const username = validateUsername(form.username)
  if (username) errors.username = username

  if (requireEmail) {
    const email = validateEmail(form.email)
    if (email) errors.email = email
  }

  if (!address?.direccion_texto?.trim() || address?.direccion_lat == null) {
    errors.address = 'Elegí tu dirección de la lista de sugerencias.'
  }

  return errors
}
