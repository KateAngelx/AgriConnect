'use server'

import { redirect } from 'next/navigation'
import { currentUser } from '@/server/auth'
import { isApprovedBuyer } from '@/server/roles'
import { cancelBuyerOrder, confirmBuyerReceived } from '@/server/orders'

export async function cancelBuyerOrderAction(formData) {
  const user = await currentUser()
  if (!user) redirect('/login')
  if (!isApprovedBuyer(user)) redirect('/products')
  const result = await cancelBuyerOrder(user, formData.get('orderId'))
  const orderId = encodeURIComponent(String(formData.get('orderId') || ''))
  if (result.error) redirect(`/buyer/orders?order=${orderId}&error=${encodeURIComponent(result.error)}`)
  redirect(`/buyer/orders?order=${orderId}&success=Order%20cancelled`)
}

export async function confirmReceivedAction(formData) {
  const user = await currentUser()
  if (!user) redirect('/login')
  if (!isApprovedBuyer(user)) redirect('/products')
  const orderId = String(formData.get('orderId') || '')
  const result = await confirmBuyerReceived(user, orderId)
  if (result.error) redirect(`/buyer/orders?order=${encodeURIComponent(orderId)}&error=${encodeURIComponent(result.error)}`)
  redirect(`/buyer/orders?order=${encodeURIComponent(orderId)}&success=Delivery%20confirmed`)
}
