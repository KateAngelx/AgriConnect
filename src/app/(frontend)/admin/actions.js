'use server'

import { redirect } from 'next/navigation'
import { currentUser } from '@/server/auth'
import { isApprovedAdmin } from '@/server/roles'
import { reviewRoleApplication } from '@/server/applications'
import { markCommissionPaid, setUserStatus } from '@/server/admin'

async function admin() {
  const user = await currentUser()
  if (!user) redirect('/login')
  if (!isApprovedAdmin(user)) redirect('/account')
  return user
}

export async function setStatusAction(formData) {
  const user = await admin()
  const result = await setUserStatus(user, formData.get('userId'), formData.get('status'))
  const error = result.error ? `?error=${encodeURIComponent(result.error)}` : ''
  redirect(`/admin/users${error}`)
}

export async function reviewApplicationAction(formData) {
  const user = await admin()
  const result = await reviewRoleApplication(
    user,
    formData.get('applicationId'),
    formData.get('decision'),
    formData.get('adminNote'),
  )
  if (result.error) redirect(`/admin/applications?error=${encodeURIComponent(result.error)}`)
  redirect(`/admin/applications?success=${encodeURIComponent(`Application marked ${String(formData.get('decision')).replaceAll('-', ' ')}`)}&filter=pending`)
}

export async function payCommissionAction(formData) {
  const user = await admin()
  const result = await markCommissionPaid(user, formData.get('deliveryId'))
  const error = result.error ? `?error=${encodeURIComponent(result.error)}` : ''
  redirect(`/admin/payments${error}`)
}
