'use server'

import { redirect } from 'next/navigation'
import { currentUser } from '@/server/auth'
import { isApprovedAdmin } from '@/server/roles'
import { reviewRoleApplication } from '@/server/applications'
import { markCommissionPaid, markPlatformCommissionPaid, setUserStatus } from '@/server/admin'
import { readyStore } from '@/server/store'
import { save } from '@/server/sync'
import { notify } from '@/server/notifications'
import { normalizeCommissionRate, COMMISSION_MAX } from '@/server/payments'

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
  if (result.error) redirect(`/admin/payments?error=${encodeURIComponent(result.error)}`)
  redirect('/admin/payments?success=Commission marked as paid.')
}

export async function payPlatformCommissionAction(formData) {
  const user = await admin()
  const result = await markPlatformCommissionPaid(user, formData.get('orderId'))
  if (result.error) redirect(`/admin/payments?error=${encodeURIComponent(result.error)}`)
  redirect('/admin/payments?success=Platform commission marked as collected.')
}

export async function updatePlatformFeeAction(formData) {
  const user = await admin()
  const rate = formData.get('commissionRate')
  const numericRate = Number(rate)
  if (!Number.isFinite(numericRate) || numericRate < 0 || numericRate > COMMISSION_MAX) {
    redirect(`/admin/settings?error=Commission must be between 0 and ${COMMISSION_MAX}.`)
  }
  const store = await readyStore()
  if (!store.settings) store.settings = {}
  store.settings.commissionRate = normalizeCommissionRate(numericRate)
  await save()
  redirect('/admin/settings?success=Commission rate updated.')
}

export async function remitPlatformFeeAction(formData) {
  const user = await admin()
  const deliveryId = formData.get('deliveryId')
  const store = await readyStore()
  const delivery = store.deliveries.find((item) => item.id === deliveryId)
  if (!delivery) redirect(`/admin/payments?error=Delivery not found.`)
  delivery.commissionStatus = 'paid'
  await notify(delivery.courierId, 'Commission remitted', 'The platform commission has been remitted.', '/admin/payments')
  await save()
  redirect('/admin/payments?success=Commission remitted.')
}
