'use server'

import { redirect } from 'next/navigation'
import { currentUser } from '@/server/auth'
import { isApprovedBuyer } from '@/server/roles'
import { cancelBuyerOrder } from '@/server/orders'

export async function cancelBuyerOrderAction(formData) {
  const user = await currentUser()
  if (!user) redirect('/login')
  if (!isApprovedBuyer(user)) redirect('/products')
  const result = await cancelBuyerOrder(user, formData.get('orderId'))
  if (result.error) redirect(`/buyer/orders/${formData.get('orderId')}?error=${encodeURIComponent(result.error)}`)
  redirect(`/buyer/orders/${formData.get('orderId')}?success=Order%20cancelled`)
}
