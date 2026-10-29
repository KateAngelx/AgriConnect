'use server'

import { redirect } from 'next/navigation'
import { homeForRole } from '@/server/auth'
import { loginAfterPhoneVerification } from '@/server/auth-phone-complete'

export async function verifyPhoneAction(_state, formData) {
  const result = await loginAfterPhoneVerification({
    phone: formData.get('phone'),
    token: formData.get('token'),
  })
  if (result.error) return { error: result.error }
  redirect(homeForRole(result.user))
}

export async function resendPhoneOtpAction(_state, formData) {
  const { sendPhoneVerificationOtp } = await import('@/server/phone-verify')
  const result = await sendPhoneVerificationOtp(formData.get('phone'))
  if (result.error) return { error: result.error }
  return { ok: true, message: 'Verification code sent.' }
}
