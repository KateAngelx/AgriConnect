/** Philippine phone normalization and identifier detection. */

export function normalizePhilippinePhone(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('63') && digits.length === 12) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 11) return `+63${digits.slice(1)}`
  if (digits.length === 10 && digits.startsWith('9')) return `+63${digits}`
  return ''
}

export function isEmailIdentifier(value) {
  const text = String(value ?? '').trim()
  return text.includes('@') && text.includes('.')
}

export function isPhoneIdentifier(value) {
  return normalizePhilippinePhone(value).length > 0
}

export function maskPhone(e164) {
  if (!e164 || e164.length < 8) return e164
  return `${e164.slice(0, 4)}···${e164.slice(-4)}`
}

/** Strip spaces/dashes from SMS codes; Supabase expects digits only. */
export function normalizeOtpCode(raw) {
  return String(raw ?? '').replace(/\D/g, '').slice(0, 8)
}
