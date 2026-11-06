import assert from 'node:assert/strict'
import test from 'node:test'

delete process.env.NEXT_PUBLIC_SUPABASE_URL
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
delete process.env.SUPABASE_SERVICE_ROLE_KEY

const { cancelOrderAndReleaseReservations } = await import('../src/server/order-cancellation.js')
const { markPaymongoCheckoutPaid } = await import('../src/server/payments.js')
const { readyStore } = await import('../src/server/store.js')

const buyer = {
  id: 'order-cancellation-buyer',
  name: 'Test Buyer',
  role: 'buyer',
  roles: ['buyer'],
  status: 'approved',
}

function makeOrder({ id, paymentMethod, paymentStatus }) {
  return {
    id,
    reference: `AGR-${id}`,
    buyer: buyer.id,
    buyerName: buyer.name,
    paymentMethod,
    paymentStatus,
    status: 'placed',
    fulfillment: 'delivery',
    subtotal: 30,
    deliveryFee: 49,
    platformFee: 2,
    platformFeeStatus: 'held-collector',
    items: [
      {
        id: `${id}-item`,
        quantity: 1,
        unitPrice: 30,
        product: { id: `${id}-product`, name: 'Test produce' },
      },
    ],
    createdAt: new Date().toISOString(),
  }
}

test('buyer cancellation restores stock and closes unpaid COD charges and commissions', async () => {
  const store = await readyStore()
  const id = 'order-cancel-cod'
  const product = { id: `${id}-product`, stock: 3 }
  const order = makeOrder({ id, paymentMethod: 'cash-on-delivery', paymentStatus: 'pending' })
  const payment = { id: `${id}-payment`, orderId: id, status: 'pending', provider: 'cash' }
  const delivery = {
    id: `${id}-delivery`,
    orderId: id,
    status: 'open',
    commission: 49,
    commissionStatus: 'pending',
    updates: [],
  }
  store.products.push(product)
  store.orders.set(id, order)
  store.payments.push(payment)
  store.deliveries.push(delivery)

  try {
    cancelOrderAndReleaseReservations(store, order, 'the buyer')
    assert.equal(product.stock, 4)
    assert.equal(order.status, 'cancelled')
    assert.equal(order.paymentStatus, 'cancelled')
    assert.equal(order.platformFee, 0)
    assert.equal(order.platformFeeStatus, 'cancelled')
    assert.equal(payment.status, 'cancelled')
    assert.equal(delivery.status, 'cancelled')
    assert.equal(delivery.commission, 0)
    assert.equal(delivery.commissionStatus, 'cancelled')
    assert.match(delivery.updates[0].note, /cancelled by the buyer/i)
  } finally {
    store.products = store.products.filter((entry) => entry.id !== product.id)
    store.orders.delete(id)
    store.payments = store.payments.filter((entry) => entry.id !== payment.id)
    store.deliveries = store.deliveries.filter((entry) => entry.id !== delivery.id)
    store.notifications = store.notifications.filter((entry) => entry.userId !== buyer.id)
  }
})

test('buyer cancellation preserves captured online payments for refund and handles late capture', async () => {
  const store = await readyStore()
  const paidId = 'order-cancel-paid-online'
  const paidOrder = makeOrder({ id: paidId, paymentMethod: 'paymongo', paymentStatus: 'paid' })
  const paidPayment = {
    id: `${paidId}-payment`,
    orderId: paidId,
    status: 'paid',
    provider: 'paymongo',
  }
  const pendingId = 'order-cancel-pending-online'
  const pendingOrder = makeOrder({
    id: pendingId,
    paymentMethod: 'paymongo',
    paymentStatus: 'pending',
  })
  const pendingPayment = {
    id: `${pendingId}-payment`,
    orderId: pendingId,
    status: 'pending',
    provider: 'paymongo',
  }
  store.orders.set(paidId, paidOrder)
  store.orders.set(pendingId, pendingOrder)
  store.payments.push(paidPayment, pendingPayment)

  try {
    cancelOrderAndReleaseReservations(store, paidOrder, 'the buyer')
    assert.equal(paidOrder.paymentStatus, 'refund-pending')
    assert.equal(paidPayment.status, 'paid')

    cancelOrderAndReleaseReservations(store, pendingOrder, 'the buyer')
    assert.equal(pendingOrder.paymentStatus, 'cancelled')
    assert.equal(pendingPayment.status, 'cancelled')

    assert.deepEqual(await markPaymongoCheckoutPaid({ orderIds: [pendingId] }), { ok: true })
    assert.equal(pendingOrder.status, 'cancelled')
    assert.equal(pendingOrder.paymentStatus, 'refund-pending')
    assert.equal(pendingPayment.status, 'paid')
    assert.ok(
      store.notifications.some(
        (entry) =>
          entry.userId === buyer.id &&
          entry.body.includes('after this order was cancelled') &&
          entry.body.includes('refund is pending'),
      ),
    )
  } finally {
    store.orders.delete(paidId)
    store.orders.delete(pendingId)
    store.payments = store.payments.filter(
      (entry) => entry.id !== paidPayment.id && entry.id !== pendingPayment.id,
    )
    store.notifications = store.notifications.filter((entry) => entry.userId !== buyer.id)
  }
})
