import { normalizePhilippinePhone } from '@/lib/phone'

/** Semaphore / PhilSMS expect 639XXXXXXXXX (no +). */
export function toPhilippineSmsDigits(phone) {
  const e164 = normalizePhilippinePhone(phone)
  if (!e164) return ''
  return e164.replace(/\D/g, '')
}
