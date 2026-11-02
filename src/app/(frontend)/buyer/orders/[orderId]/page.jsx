import { redirect } from 'next/navigation'

export default async function BuyerOrderPage({ params, searchParams }) {
  const { orderId } = await params
  const query = await searchParams
  const next = new URLSearchParams()
  next.set('order', orderId)
  for (const key of ['error', 'success', 'payment']) {
    if (typeof query[key] === 'string') next.set(key, query[key])
  }
  redirect(`/buyer/orders?${next.toString()}`)
}
