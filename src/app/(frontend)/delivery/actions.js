'use server'

import { redirect } from 'next/navigation'
import { currentUser } from '@/server/auth'
import { hasRole, isApprovedDelivery } from '@/server/roles'
import { courierCollect, saveServiceArea, submitProofOfDelivery, updateAssignment } from '@/server/delivery'
import { readyStore } from '@/server/store'

async function courier() {
  const user = await currentUser()
  if (!user) redirect('/login')
  if (!hasRole(user, 'delivery')) redirect('/account')
  if (!isApprovedDelivery(user)) redirect('/delivery/dashboard')
  return user
}

export async function trackAction(formData) {
  const user = await courier()
  const deliveryId = String(formData.get('deliveryId') || '')
  const storeBeforeUpdate = await readyStore()
  const previousStatus = storeBeforeUpdate.deliveries.find((delivery) => delivery.id === deliveryId)?.status
  const result = await updateAssignment(user, deliveryId, formData.get('note'))
  if (result.error) redirect(`/delivery/deliveries?job=${encodeURIComponent(deliveryId)}&error=${encodeURIComponent(result.error)}`)
  const labels = {
    accepted: 'Delivery accepted',
    'picked-up': 'Marked as picked up',
    'in-transit': 'Marked in transit',
    delivered: 'Delivery completed',
  }
  const nextStatuses = {
    open: 'accepted',
    accepted: 'picked-up',
    'picked-up': 'in-transit',
    'in-transit': 'delivered',
  }
  redirect(`/delivery/deliveries?job=${encodeURIComponent(deliveryId)}&success=${encodeURIComponent(labels[nextStatuses[previousStatus]] || 'Assignment updated')}`)
}

export async function collectDeliveryAction(formData) {
  const user = await courier()
  const result = await courierCollect(user, formData.get('orderId'))
  if (result.error) redirect(`/delivery/deliveries?error=${encodeURIComponent(result.error)}`)
  redirect('/delivery/deliveries?success=Cash%20collection%20recorded')
}

export async function proofDeliveryAction(formData) {
  const user = await courier()
  const deliveryId = String(formData.get('deliveryId') || '')
  const result = await submitProofOfDelivery(user, deliveryId, formData.get('proof'))
  if (result.error) redirect(`/delivery/deliveries?job=${encodeURIComponent(deliveryId)}&error=${encodeURIComponent(result.error)}`)
  redirect(`/delivery/deliveries?job=${encodeURIComponent(deliveryId)}&success=Proof%20of%20delivery%20submitted`)
}

export async function serviceAreaAction(_state, formData) {
  const user = await courier()
  const result = await saveServiceArea(
    user,
    formData.get('serviceArea'),
    formData.get('serviceAreaLat'),
    formData.get('serviceAreaLng'),
    formData.get('serviceLocations'),
  )
  if (result.error) return result
  redirect('/delivery/dashboard')
}
