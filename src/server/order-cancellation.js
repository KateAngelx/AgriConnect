const capturedPaymentStatuses = new Set(['paid', 'captured'])
const refundStatuses = new Set(['paid', 'captured', 'refund-pending'])

export function cancelOrderAndReleaseReservations(store, order, actor) {
  for (const item of order.items || []) {
    const productId = item.product?.id || item.productId
    const product = store.products.find((entry) => entry.id === productId)
    if (product) product.stock += item.quantity
  }

  order.status = 'cancelled'
  order.platformFee = 0
  order.platformFeeStatus = 'cancelled'

  const payments = store.payments.filter((payment) => payment.orderId === order.id)
  const refundRequired =
    refundStatuses.has(order.paymentStatus) ||
    payments.some((payment) => capturedPaymentStatuses.has(payment.status))
  order.paymentStatus = refundRequired ? 'refund-pending' : 'cancelled'
  for (const payment of payments) {
    if (!capturedPaymentStatuses.has(payment.status)) payment.status = 'cancelled'
  }

  const delivery = store.deliveries.find((item) => item.orderId === order.id)
  if (delivery) {
    delivery.status = 'cancelled'
    delivery.commission = 0
    delivery.commissionStatus = 'cancelled'
    delivery.updatedAt = new Date().toISOString()
    delivery.updates ??= []
    delivery.updates.push({
      at: delivery.updatedAt,
      status: 'cancelled',
      note: `Order cancelled by ${actor}.`,
    })
  }

  return { delivery, refundRequired }
}
