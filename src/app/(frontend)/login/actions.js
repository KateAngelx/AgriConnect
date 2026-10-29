'use server'

import { redirect } from 'next/navigation'
import { homeForRole, loginAccount } from '@/server/auth'
import { phoneVerifyRedirectQuery } from '@/server/phone-verify'

export async function loginAction(_state, formData) {
  const result = await loginAccount({
    identifier: formData.get('identifier'),
    password: formData.get('password'),
  })
  if (result.error) {
    if (result.needsPhoneVerification && result.phone) {
      redirect(`/register/verify-phone?${await phoneVerifyRedirectQuery(result.phone)}`)
    }
    return { error: result.error }
  }
  const next = String(formData.get('next') ?? '')
  const destination =
    next.startsWith('/') && !next.startsWith('//') ? next : homeForRole(result.user)
  redirect(destination)
}
