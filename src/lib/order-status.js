/** Buyer-facing order progress labels (English). */

export const PICKUP_STAGES = [
  'placed',
  'confirmed',
  'preparing',
  'ready-for-pickup',
  'picked-up',
  'completed',
]

export const DELIVERY_STAGES = [
  'placed',
  'confirmed',
  'preparing',
  'awaiting-delivery',
  'delivery-assigned',
  'courier-picked-up',
  'out-for-delivery',
  'delivered',
  'completed',
]

export const ORDER_STATUS_LABELS = {
  placed: 'Order placed',
  confirmed: 'Order confirmed',
  preparing: 'Preparing order',
  'ready-for-pickup': 'Ready for pickup',
  'picked-up': 'Picked up',
  'awaiting-delivery': 'Ready for dispatch',
  'delivery-assigned': 'Delivery assignment accepted',
  'courier-picked-up': 'Picked up by delivery partner',
  'out-for-delivery': 'Out for delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  'delivery-failed': 'Delivery failed',
}

export function stagesForFulfillment(fulfillment) {
  return fulfillment === 'pickup' ? PICKUP_STAGES : DELIVERY_STAGES
}

export function orderStatusLabel(status) {
  const key = String(status || '').toLowerCase()
  return ORDER_STATUS_LABELS[key] || key.replaceAll('-', ' ')
}

export function stageIndex(stages, status) {
  const index = stages.indexOf(status)
  return index >= 0 ? index : 0
}
