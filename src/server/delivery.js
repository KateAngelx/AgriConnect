import { refreshDeliveryEtaIso } from '@/lib/delivery-eta'
import { listDeliveryWorkForUser } from './delivery-assignments'
import { notify } from './notifications'
import { collectCash } from './payments'
import { isApprovedDelivery, hasRole, rolesFromLegacy } from './roles'
import { save } from './sync'
import { readyStore } from './store'

function deliveryHintForOrder(store, order) {
  const parts = [order.deliveryAddress || '', order.instructions || '']
  for (const item of order.items || []) {
    const productId = item.product?.id || item.productId
    const product = store.products.find((entry) => entry.id === productId)
    if (product?.location) parts.push(product.location)
    const seller = product?.seller || store.sellers.find((entry) => entry.id === item.sellerId)
    if (seller?.location) parts.push(seller.location)
  }
  return parts.join(' ').toLowerCase()
}

function courierMatchesHint(courier, hint) {
  const area = String(courier.serviceArea || '').toLowerCase()
  if (!area.trim()) return false
  return area.split(/[,;]/).some((term) => {
    const token = term.trim()
    return token.length > 2 && hint.includes(token)
  })
}

export function eligibleCouriersForOrder(store, order) {
  const hint = deliveryHintForOrder(store, order)
  const couriers = [...store.users.values()].filter((entry) => {
    const roles = rolesFromLegacy(entry)
    return roles.includes('delivery') && entry.status === 'approved'
  })
  const matched = couriers.filter((courier) => courierMatchesHint(courier, hint))
  return matched.length ? matched : couriers
}

const steps = {
  open: 'accepted',
  accepted: 'picked-up',
  'picked-up': 'in-transit',
  'in-transit': 'delivered',
}

export async function deliverySnapshot(user) {
  const store = await readyStore()
  const mine = store.deliveries.filter((item) => item.courierId === user.id)
  const pending = mine.filter((item) => item.commissionStatus === 'pending' && item.status === 'delivered')
  return {
    open: store.deliveries.filter((item) => item.status === 'open').length,
    active: mine.filter((item) => !['delivered', 'cancelled'].includes(item.status)).length,
    commission: pending.reduce((sum, item) => sum + item.commission, 0),
  }
}

export async function listCourierWork(user) {
  return listDeliveryWorkForUser(user)
}

export async function listCommissions(user) {
  const work = await listCourierWork(user)
  return work.filter((item) => item.courierId === user.id && item.status === 'delivered')
}

export async function assignmentForOrder(orderId) {
  const store = await readyStore()
  const delivery = store.deliveries.find((item) => item.orderId === orderId) || null
  if (!delivery) return null
  return { ...delivery, courier: store.users.get(delivery.courierId) || null }
}

export async function updateAssignment(user, deliveryId, note) {
  if (!hasRole(user, 'delivery') || user.status !== 'approved') {
    return { error: 'Delivery tools unlock after approval.' }
  }
  const store = await readyStore()
  const delivery = store.deliveries.find((item) => item.id === deliveryId)
  const order = delivery ? store.orders.get(delivery.orderId) : null
  if (!delivery || !order) return { error: 'Assignment not found.' }
  if (delivery.status !== 'open' && delivery.courierId !== user.id) {
    return { error: 'Another courier already accepted this assignment.' }
  }
  const next = steps[delivery.status]
  if (!next) return { error: 'This assignment is already complete.' }
  if (delivery.status === 'open') delivery.courierId = user.id
  delivery.status = next
  delivery.note = String(note ?? '').trim().slice(0, 240)
  delivery.updatedAt = new Date().toISOString()
  delivery.updates.push({ at: delivery.updatedAt, status: next, note: delivery.note })
  if (next === 'accepted') order.status = 'delivery-assigned'
  if (next === 'picked-up') order.status = 'courier-picked-up'
  if (next === 'in-transit') order.status = 'out-for-delivery'
  if (next === 'delivered') order.status = 'delivered'
  if (order.fulfillment === 'delivery') {
    order.estimatedArrivalAt = refreshDeliveryEtaIso(order, next)
  }
  await notify(
    order.buyer,
    `${order.reference} is ${next.replaceAll('-', ' ')}`,
    delivery.note || 'Your courier updated the delivery.',
    `/buyer/orders/${order.id}`,
  )
  await save()
  return { ok: true }
}

export async function saveServiceArea(user, serviceArea) {
  if (!hasRole(user, 'delivery')) return { error: 'Only delivery accounts can set a service area.' }
  const area = String(serviceArea ?? '').trim().slice(0, 120)
  if (area.length < 2) return { error: 'Enter the areas you can serve.' }
  const store = await readyStore()
  const record = store.users.get(user.id)
  if (!record) return { error: 'Account not found.' }
  record.serviceArea = area
  await save()
  return { ok: true }
}

export async function courierCollect(user, orderId) {
  return collectCash(orderId, user)
}
