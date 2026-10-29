import { Webhook } from 'standardwebhooks'
import { sendPhilippinesOtpSms } from '@/server/sms/send-otp'

function hookSecret() {
  const raw = process.env.SUPABASE_SEND_SMS_HOOK_SECRET?.trim()
  if (!raw) return null
  return raw.startsWith('v1,whsec_') ? raw.replace('v1,whsec_', '') : raw
}

export async function POST(request) {
  const secret = hookSecret()
  if (!secret) {
    return Response.json(
      { error: { http_code: 500, message: 'SUPABASE_SEND_SMS_HOOK_SECRET is not set on the server.' } },
      { status: 500 },
    )
  }
  const payloadText = await request.text()
  const headers = Object.fromEntries(request.headers)
  let event
  try {
    const wh = new Webhook(secret)
    event = wh.verify(payloadText, headers)
  } catch {
    return Response.json(
      { error: { http_code: 401, message: 'Invalid Send SMS hook signature.' } },
      { status: 401 },
    )
  }
  const phone = event?.user?.phone
  const otp = event?.sms?.otp
  if (!phone || !otp) {
    return Response.json(
      { error: { http_code: 400, message: 'Missing phone or OTP in hook payload.' } },
      { status: 400 },
    )
  }
  const result = await sendPhilippinesOtpSms({ phone, otp })
  if (result.error) {
    return Response.json({ error: { http_code: 502, message: result.error } }, { status: 502 })
  }
  return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
}
