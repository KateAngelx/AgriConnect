import { toPhilippineSmsDigits } from '@/server/sms/ph-number'

export async function sendSemaphoreSms({ phone, message }) {
  const apikey = process.env.SEMAPHORE_API_KEY?.trim()
  const sendername = process.env.SEMAPHORE_SENDER_NAME?.trim()
  if (!apikey || !sendername) {
    return { error: 'Semaphore is not configured (SEMAPHORE_API_KEY, SEMAPHORE_SENDER_NAME).' }
  }
  const number = toPhilippineSmsDigits(phone)
  if (!number) return { error: 'Invalid Philippine mobile number.' }
  const body = new URLSearchParams({
    apikey,
    number,
    message,
    sendername,
  })
  const response = await fetch('https://api.semaphore.co/api/v4/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = payload?.message || payload?.error || response.statusText
    return { error: `Semaphore: ${detail}` }
  }
  return { ok: true, provider: 'semaphore', id: payload?.message_id ?? payload?.[0]?.message_id }
}
