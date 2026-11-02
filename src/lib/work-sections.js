import { nextSellerAction } from '@/server/seller'

export function sellerOrderSection(order) {
  if (order.status === 'cancelled') return 'cancelled'
  if (order.status === 'completed') return 'completed'
  if (nextSellerAction(order.fulfillment, order.status)) return 'needs-you'
  return 'active'
}

export function buyerOrderSection(order) {
  if (order.status === 'cancelled' || order.status === 'delivery-failed') return 'cancelled'
  if (['completed', 'delivered', 'picked-up'].includes(order.status)) return 'delivered'
  return 'active'
}

export function groupBySection(items, sectionFor) {
  const groups = {}
  for (const item of items) {
    const key = sectionFor(item)
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  }
  return groups
}
