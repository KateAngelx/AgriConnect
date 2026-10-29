import { readyStore } from './store'
import { hasRole } from './roles'

function generalArea(text) {
  const value = String(text ?? '').trim()
  if (!value) return 'Area not specified'
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 2) return parts.slice(-2).join(', ')
  if (value.length > 48) return `${value.slice(0, 45)}…`
  return value
}

function pickupAreaForOrder(store, order) {
  if (!order) return 'Area not specified'
  const locations = []
  for (const item of order.items || []) {
    const productId = item.product?.id
    const product = store.products.find((entry) => entry.id === productId)
    const seller =
      product?.seller || store.sellers.find((entry) => entry.id === item.sellerId || item.sellerId)
    if (item.pickupLocation) locations.push(item.pickupLocation)
    else if (seller?.location) locations.push(seller.location)
    else if (product?.location) locations.push(product.location)
  }
  const unique = [...new Set(locations.filter(Boolean))]
  return unique.length ? generalArea(unique.join('; ')) : 'Area not specified'
}

export function deliveryAssignmentForViewer(store, delivery, order, viewerUserId) {
  const accepted =
    delivery.courierId &&
    delivery.courierId === viewerUserId &&
    delivery.status !== 'open'
  const pickupArea = pickupAreaForOrder(store, order)

  const base = {
    id: delivery.id,
    orderId: delivery.orderId,
    status: delivery.status,
    commission: delivery.commission,
    commissionStatus: delivery.commissionStatus,
    reference: order?.reference || '',
    fulfillment: order?.fulfillment || 'delivery',
    pickupArea,
    deliveryAreaGeneral: generalArea(order?.deliveryAddress),
    itemCount: order?.items?.length || 0,
    subtotal: order?.subtotal || 0,
    canAccept: delivery.status === 'open' && !delivery.courierId,
    isMine: delivery.courierId === viewerUserId,
  }

  if (accepted) {
    const pickup = order?.sellerPickup
    return {
      ...base,
      deliveryAddress: order?.deliveryAddress || '',
      contactNumber: order?.contactNumber || '',
      buyerName: order?.buyerName || '',
      instructions: order?.instructions || '',
      pickupLocations: pickupArea,
      pickupLat: pickup?.pickupLat ?? null,
      pickupLng: pickup?.pickupLng ?? null,
      deliveryLat: order?.deliveryLat ?? null,
      deliveryLng: order?.deliveryLng ?? null,
      estimatedArrivalAt: order?.estimatedArrivalAt ?? null,
      privacy: 'full',
    }
  }

  return {
    ...base,
    deliveryAddress: null,
    contactNumber: null,
    buyerName: null,
    instructions: null,
    pickupLocations: pickupArea,
    privacy: 'preview',
  }
}

export async function listDeliveryWorkForUser(user) {
  if (!hasRole(user, 'delivery') || user.status !== 'approved') return []
  const store = await readyStore()
  return store.deliveries
    .filter((item) => item.status === 'open' || item.courierId === user.id)
    .map((item) => {
      const order = store.orders.get(item.orderId) || null
      return {
        ...deliveryAssignmentForViewer(store, item, order, user.id),
        id: item.id,
        order: order
          ? {
              id: order.id,
              reference: order.reference,
              paymentMethod: order.paymentMethod,
              paymentStatus: order.paymentStatus,
              status: order.status,
            }
          : null,
        deliveryId: item.id,
      }
    })
    .sort((a, b) => (a.reference < b.reference ? 1 : -1))
}
