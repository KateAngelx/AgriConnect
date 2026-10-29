'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { placeOrder } from '@/server/orders'

export async function placeOrderAction(_state, formData) {
  const headerList = await headers()
  const proto = headerList.get('x-forwarded-proto') || 'http'
  const host = headerList.get('x-forwarded-host') || headerList.get('host')
  const result = await placeOrder({
    fulfillment: formData.get('fulfillment'),
    contactNumber: formData.get('contactNumber'),
    deliveryAddress: formData.get('deliveryAddress'),
    deliveryLandmark: formData.get('deliveryLandmark'),
    deliveryLat: formData.get('deliveryLat'),
    deliveryLng: formData.get('deliveryLng'),
    instructions: formData.get('instructions'),
    paymentMethod: formData.get('paymentMethod'),
    origin: `${proto}://${host}`,
  })
  if (result.redirectTo) redirect(result.redirectTo)
  if (result.error) return { error: result.error }
  if (result.checkoutUrl) redirect(result.checkoutUrl)
  if (result.orders?.length === 1) redirect(`/buyer/orders/${result.orders[0].id}`)
  redirect('/buyer/orders')
}
