import { getSupabaseAnon, supabaseEnv } from '@/lib/supabase'
import { normalizeOtpCode, normalizePhilippinePhone } from '@/lib/phone'
import { consumePhoneOtp, generateNumericOtp, savePhoneOtp } from '@/server/phone-otp-store'
import { philippinesSmsConfigured, sendPhilippinesOtpSms } from '@/server/sms/send-otp'

const otpCooldown = new Map()

/** Local-only fallback when Twilio/Supabase SMS is not available (never use in production). */
export function devPhoneBypassEnabled() {
  if (process.env.NODE_ENV === 'production') return false
  return String(process.env.SUPABASE_PHONE_DEV_BYPASS ?? '').trim() === '1'
}

export function philsmsDirectOtpEnabled() {
  if (devPhoneBypassEnabled()) return false
  if (process.env.NODE_ENV === 'production' && process.env.PHILSMS_DIRECT_OTP === '1') {
    console.warn('PHILSMS_DIRECT_OTP is for capstone/dev; prefer Supabase Send SMS Hook in production.')
  }
  const flag = String(process.env.PHILSMS_DIRECT_OTP ?? '').trim()
  const on = flag === '1' || flag.toLowerCase() === 'true'
  return on && philippinesSmsConfigured()
}

export function phoneSmsConfigured() {
  const flag = String(process.env.SUPABASE_PHONE_AUTH_ENABLED ?? '').trim()
  const enabled = flag === '1' || flag.toLowerCase() === 'true'
  if (devPhoneBypassEnabled() && enabled) return true
  if (philsmsDirectOtpEnabled() && enabled) return true
  return Boolean(enabled && supabaseEnv().anonKey && supabaseEnv().url)
}

export function phoneAuthSetupMessage() {
  return (
    'Phone SMS verification is not enabled. In the Supabase dashboard, configure Phone auth with an SMS provider ' +
    '(for example Twilio or MessageBird), then set SUPABASE_PHONE_AUTH_ENABLED=1 in your server environment.'
  )
}

function mapPhoneAuthError(error) {
  const message = String(error?.message ?? '')
  const code = String(error?.code ?? '')
  if (code === 'phone_provider_disabled' || /unsupported phone provider/i.test(message)) {
    return (
      'Supabase Phone sign-in is disabled. Enable Phone under Authentication → Providers. ' +
      'For affordable PH SMS (no Twilio), use the Send SMS Hook + Semaphore/PhilSMS — see docs/PH-AFFORDABLE-SMS.md. ' +
      'Or use test OTP / email registration.'
    )
  }
  if (/captcha/i.test(message)) {
    return (
      'Supabase blocked OTP (CAPTCHA). For local dev, turn off Authentication → Bot and Abuse Protection → CAPTCHA, ' +
      'or add a captcha widget to the verify page.'
    )
  }
  return message || 'Could not send or verify the code.'
}

export async function sendPhoneVerificationOtp(phoneRaw) {
  const phone = normalizePhilippinePhone(phoneRaw)
  if (!phone) return { error: 'Enter a valid Philippine mobile number (09XX or +63).' }
  if (!phoneSmsConfigured()) return { error: phoneAuthSetupMessage() }
  const last = otpCooldown.get(phone) || 0
  if (Date.now() - last < 60_000) {
    return { error: 'Wait a minute before requesting another code.' }
  }
  if (devPhoneBypassEnabled()) {
    otpCooldown.set(phone, Date.now())
    return { ok: true, phone, devBypass: true }
  }
  if (philsmsDirectOtpEnabled()) {
    const otp = generateNumericOtp()
    const sent = await sendPhilippinesOtpSms({ phone, otp })
    if (sent.error) return { error: sent.error }
    savePhoneOtp(phone, otp)
    otpCooldown.set(phone, Date.now())
    return { ok: true, phone, channel: sent.provider || 'philsms' }
  }
  const client = getSupabaseAnon()
  if (!client) return { error: phoneAuthSetupMessage() }
  const { error } = await client.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: true },
  })
  if (error) return { error: mapPhoneAuthError(error) }
  otpCooldown.set(phone, Date.now())
  return { ok: true, phone }
}

export async function verifyPhoneVerificationOtp(phoneRaw, token) {
  const phone = normalizePhilippinePhone(phoneRaw)
  const code = normalizeOtpCode(token)
  if (!phone || code.length < 4) return { error: 'Enter the verification code from your SMS.' }
  if (!phoneSmsConfigured()) return { error: phoneAuthSetupMessage() }
  if (devPhoneBypassEnabled()) {
    const expected = String(process.env.SUPABASE_PHONE_DEV_OTP ?? '123456').trim()
    if (code === expected) return { ok: true, phone }
    return {
      error: `Dev bypass is on: enter the code from SUPABASE_PHONE_DEV_OTP in .env.local (default 123456).`,
    }
  }
  if (philsmsDirectOtpEnabled()) {
    if (consumePhoneOtp(phone, code)) return { ok: true, phone }
    return {
      error: 'That code is wrong or expired. Tap “Send verification code” again and use the latest SMS.',
    }
  }
  const client = getSupabaseAnon()
  if (!client) return { error: phoneAuthSetupMessage() }
  let lastError = null
  for (const type of ['sms', 'signup']) {
    const { error } = await client.auth.verifyOtp({ phone, token: code, type })
    if (!error) return { ok: true, phone }
    lastError = error
  }
  const message = mapPhoneAuthError(lastError)
  if (/expired|invalid|403/i.test(String(lastError?.message)) || lastError?.status === 403) {
    return {
      error:
        'That code is wrong or no OTP was sent yet. Fix any red error above “Send verification code”, request a new code, then enter the latest test OTP or SMS code.',
    }
  }
  return { error: message }
}

/** Send OTP then build query string for /register/verify-phone. */
export async function phoneVerifyRedirectQuery(phoneRaw) {
  const phone = normalizePhilippinePhone(phoneRaw)
  if (!phone) return 'error=invalid-phone'
  const params = new URLSearchParams({ phone })
  const sent = await sendPhoneVerificationOtp(phone)
  if (sent.ok) params.set('sent', '1')
  else if (sent.error) params.set('sendError', sent.error)
  return params.toString()
}
