/**
 * Supabase Auth Send SMS Hook → PhilSMS (hosted on Supabase, no ngrok needed).
 * Deploy: supabase functions deploy send-sms --no-verify-jwt
 * Secrets: PHILSMS_API_TOKEN, PHILSMS_SENDER_ID, SEND_SMS_HOOK_SECRET (same as dashboard hook secret)
 */
import { Webhook } from 'npm:standardwebhooks@1.0.0'

function phDigits(e164: string) {
  return String(e164 ?? '').replace(/\D/g, '')
}

async function sendPhilSms(phone: string, message: string) {
  const token = Deno.env.get('PHILSMS_API_TOKEN')?.trim()
  const senderId = Deno.env.get('PHILSMS_SENDER_ID')?.trim()
  if (!token) throw new Error('PHILSMS_API_TOKEN not set on the Edge Function.')
  const recipient = phDigits(phone)
  if (!recipient.startsWith('63')) throw new Error('Only Philippine numbers are supported.')
  const requestBody: Record<string, string> = {
    recipient: recipient.startsWith('63') ? `+${recipient}` : recipient,
    type: 'plain',
    message,
  }
  if (senderId) requestBody.sender_id = senderId.slice(0, 11)
  const apiBase = (Deno.env.get('PHILSMS_API_BASE') ?? 'https://dashboard.philsms.com/api/v3').replace(/\/+$/, '')
  const response = await fetch(`${apiBase}/sms/send`, {
    method: 'POST',
    headers: {
      Authorization: Bearer ,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result?.status === 'error') {
    throw new Error(result?.message || result?.error || response.statusText)
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const rawSecret = Deno.env.get('SEND_SMS_HOOK_SECRET')?.trim()
  if (!rawSecret) {
    return Response.json(
      { error: { http_code: 500, message: 'SEND_SMS_HOOK_SECRET not configured on function.' } },
      { status: 500 },
    )
  }
  const secret = rawSecret.startsWith('v1,whsec_') ? rawSecret.replace('v1,whsec_', '') : rawSecret
  const payloadText = await req.text()
  const headers = Object.fromEntries(req.headers)
  let event: { user?: { phone?: string }; sms?: { otp?: string } }
  try {
    event = new Webhook(secret).verify(payloadText, headers) as typeof event
  } catch {
    return Response.json(
      { error: { http_code: 401, message: 'Invalid hook signature.' } },
      { status: 401 },
    )
  }
  const phone = event?.user?.phone
  const otp = event?.sms?.otp
  if (!phone || !otp) {
    return Response.json(
      { error: { http_code: 400, message: 'Missing phone or OTP.' } },
      { status: 400 },
    )
  }
  try {
    await sendPhilSms(
      phone,
      `AgriConnect verification code: ${otp}. Valid for 1 hour. Do not share this code.`,
    )
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PhilSMS send failed.'
    return Response.json({ error: { http_code: 502, message } }, { status: 502 })
  }
})
