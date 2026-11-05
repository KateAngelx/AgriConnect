'use server'

import { redirect } from 'next/navigation'
import { registerAccount } from '@/server/auth'
import { phoneVerifyRedirectQuery } from '@/server/phone-verify'

export async function registerAction(_state, formData) {
  const result = await registerAccount({
    name: formData.get('name'),
    authMethod: formData.get('authMethod'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    password: formData.get('password'),
    confirmation: formData.get('confirmation'),
    terms: formData.get('terms'),
  })
  if (result.error) return { error: result.error }
  if (result.needsPhoneVerification && result.phone) {
    redirect(`/register/verify-phone?${await phoneVerifyRedirectQuery(result.phone)}`)
  }
  const next = String(formData.get('next') ?? '')
  const destination = next.startsWith('/') && !next.startsWith('//') ? next : '/account?registered=1'
  redirect(destination)
}
