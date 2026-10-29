import { toPhilippineSmsDigits } from '@/server/sms/ph-number'
import { philsmsApiBase } from '@/server/sms/providers/philsms-api-base'

export async function sendPhilSms({ phone, message }) {
  const token = process.env.PHILSMS_API_TOKEN?.trim()
  const senderId = process.env.PHILSMS_SENDER_ID?.trim()
  if (!token) {
    return { error: 'PhilSMS is not configured (PHILSMS_API_TOKEN).' }
  }
  const digits = toPhilippineSmsDigits(phone)
  if (!digits) return { error: 'Invalid Philippine mobile number.' }
  const recipient = digits.startsWith('63') ? `+${digits}` : digits
  const body = {
    recipient,
    type: 'plain',
    message,
  }
  if (senderId) body.sender_id = senderId.slice(0, 11)
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  const bases = [philsmsApiBase(), 'https://dashboard.philsms.com/api/v3', 'https://app.philsms.com/api/v3'].filter(
    (b, i, arr) => b && arr.indexOf(b) === i,
  )

  let payload = {}
  let response = null
  for (const base of bases) {
    response = await fetch(`${base}/sms/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    payload = await response.json().catch(() => ({}))
    const detail = payload?.message || payload?.error || response.statusText
    if (response.ok && payload?.status !== 'error') {
      return { ok: true, provider: 'philsms', id: payload?.data?.message_id }
    }
    if (!/unauthenticated/i.test(String(detail))) break
  }

  if (!response.ok || payload?.status === 'error') {
    const detail = payload?.message || payload?.error || response.statusText
    if (/unauthenticated/i.test(String(detail))) {
      return {
        error:
          'PhilSMS rejected the API token on dashboard and app hosts. Regenerate token in PhilSMS → Developers, copy with the clipboard button, update PHILSMS_API_TOKEN in .env.local (no quotes), restart pnpm dev. Or set SUPABASE_PHONE_DEV_BYPASS=1 and use code 123456 for demo.',
      }
    }
    return { error: `PhilSMS: ${detail}` }
  }
  return { ok: true, provider: 'philsms', id: payload?.data?.message_id }
}
