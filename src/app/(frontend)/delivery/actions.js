'use server'

import { redirect } from 'next/navigation'
import { currentUser } from '@/server/auth'
import { hasRole, isApprovedDelivery } from '@/server/roles'
import { courierCollect, saveServiceArea, updateAssignment } from '@/server/delivery'

async function courier() {
  const user = await currentUser()
  if (!user) redirect('/login')
  if (!hasRole(user, 'delivery')) redirect('/account')
  if (!isApprovedDelivery(user)) redirect('/delivery/dashboard')
  return user
}

export async function trackAction(formData) {
  const user = await courier()
  const result = await updateAssignment(user, formData.get('deliveryId'), formData.get('note'))
  if (result.error) redirect(`/delivery/dashboard?error=${encodeURIComponent(result.error)}`)
  redirect('/delivery/dashboard?success=Assignment%20updated')
}

export async function collectDeliveryAction(formData) {
  const user = await courier()
  const result = await courierCollect(user, formData.get('orderId'))
  if (result.error) redirect(`/delivery/dashboard?error=${encodeURIComponent(result.error)}`)
  redirect('/delivery/dashboard?success=Cash%20collection%20recorded')
}

export async function serviceAreaAction(_state, formData) {
  const user = await courier()
  const result = await saveServiceArea(user, formData.get('serviceArea'))
  if (result.error) return result
  redirect('/delivery/dashboard')
}
