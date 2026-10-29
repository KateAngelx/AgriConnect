import { sendPhilSms } from '@/server/sms/providers/philsms'
import { sendSemaphoreSms } from '@/server/sms/providers/semaphore'

const PROVIDERS = {
  semaphore: sendSemaphoreSms,
  philsms: sendPhilSms,
}

function otpMessage(otp) {
  const code = String(otp ?? '').trim()
  return `AgriConnect verification code: ${code}. Valid for 1 hour. Do not share this code.`
}

function configuredProviders() {
  const mode = String(process.env.SMS_PROVIDER ?? 'auto').trim().toLowerCase()
  if (mode === 'semaphore') return ['semaphore']
  if (mode === 'philsms') return ['philsms']
  const list = []
  if (process.env.SEMAPHORE_API_KEY?.trim() && process.env.SEMAPHORE_SENDER_NAME?.trim()) {
    list.push('semaphore')
  }
  if (process.env.PHILSMS_API_TOKEN?.trim()) {
    list.push('philsms')
  }
  return list.length ? list : ['semaphore', 'philsms']
}

/** Send OTP SMS via PH gateways (Globe, Smart, DITO, etc.). Tries providers in order on failure. */
export async function sendPhilippinesOtpSms({ phone, otp }) {
  const message = otpMessage(otp)
  const errors = []
  for (const name of configuredProviders()) {
    const send = PROVIDERS[name]
    if (!send) continue
    const result = await send({ phone, message })
    if (result.ok) return result
    errors.push(result.error || `${name} failed`)
  }
  return {
    error:
      errors.join(' · ') ||
      'No SMS provider configured. Add Semaphore or PhilSMS keys — see docs/PH-AFFORDABLE-SMS.md.',
  }
}

export function philippinesSmsConfigured() {
  return configuredProviders().some((name) => {
    if (name === 'semaphore') {
      return Boolean(process.env.SEMAPHORE_API_KEY?.trim() && process.env.SEMAPHORE_SENDER_NAME?.trim())
    }
    if (name === 'philsms') {
      return Boolean(process.env.PHILSMS_API_TOKEN?.trim())
    }
    return false
  })
}
