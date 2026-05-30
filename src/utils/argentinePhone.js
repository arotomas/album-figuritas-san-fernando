/** Dígitos locales (código de área + número) sin +54 ni 9 móvil. Ej: 1134567890 */
export function extractArgentineMobileLocalDigits(value) {
  let digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return ''

  if (digits.startsWith('549') && digits.length >= 13) {
    digits = digits.slice(3)
  } else if (digits.startsWith('54') && digits.length >= 12) {
    digits = digits.slice(2)
    if (digits.startsWith('9')) digits = digits.slice(1)
  } else if (digits.startsWith('9') && digits.length === 11) {
    digits = digits.slice(1)
  }

  return digits
}

export function isValidArgentineMobileLocalDigits(digits) {
  return /^[1-9]\d{9}$/.test(String(digits ?? ''))
}

/** Normaliza entrada local a E.164 argentino móvil: +549XXXXXXXXXX */
export function normalizeArgentineMobileLocalInput(value) {
  const digits = extractArgentineMobileLocalDigits(value)
  if (!isValidArgentineMobileLocalDigits(digits)) return null
  return `+549${digits}`
}

export function getArgentineMobileValidation(value) {
  const digits = extractArgentineMobileLocalDigits(value)
  if (!digits) return null
  if (isValidArgentineMobileLocalDigits(digits)) {
    return { valid: true, message: 'Número válido.' }
  }
  return { valid: false, message: 'Número inválido.' }
}
