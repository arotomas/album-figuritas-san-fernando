export function extractArgentineMobileLocalDigits(value: string): string {
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

export function isValidArgentineMobileLocalDigits(digits: string): boolean {
  return /^[1-9]\d{9}$/.test(String(digits ?? ''))
}

export function normalizeArgentineMobileLocalInput(value: string): string | null {
  const digits = extractArgentineMobileLocalDigits(value)
  if (!isValidArgentineMobileLocalDigits(digits)) return null
  return `+549${digits}`
}

export type PushTestLookupResult = {
  ok: boolean
  error?: string
  user_id?: string
  full_name?: string | null
  email?: string
  active_devices?: number
  phone?: string
}

export async function lookupPushTestRecipient(
  adminClient: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> },
  localPhone: string,
): Promise<PushTestLookupResult> {
  const { data, error } = await adminClient.rpc('lookup_push_test_recipient', {
    p_local_phone: localPhone,
  })

  if (error) {
    throw error
  }

  return (data ?? { ok: false, error: 'INTERNAL_ERROR' }) as PushTestLookupResult
}
