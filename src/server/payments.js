import { notify } from './notifications'
import { save } from './sync'
import { readyStore } from './store'

export { verifyPaymongoWebhook } from './paymongo-signature.js'

export const DELIVERY_FEE = 49

export function orderTotal(order) {
  return Number(order.subtotal || 0) + Number(order.deliveryFee || 0)
}

export function itemSellerId(item) {
  return item.sellerId || item.product?.seller?.id || item.product?.seller || ''
}

function paymongoHeader() {
  const secret = process.env.PAYMONGO_SECRET_KEY
  if (!secret) return ''
  return `Basic ${Buffer.from(`${secret}:`).toString('base64')}`
}

function xenditHeader() {
  const secret = process.env.XENDIT_SECRET_KEY
  if (!secret) return ''
  return `Basic ${Buffer.from(`${secret}:`).toString('base64')}`
}

export function electronicPaymentConfigured() {
  return Boolean(process.env.PAYMONGO_SECRET_KEY || process.env.XENDIT_SECRET_KEY)
}

export function electronicPaymentProvider() {
  if (process.env.XENDIT_SECRET_KEY) return 'xendit'
  if (process.env.PAYMONGO_SECRET_KEY) return 'paymongo'
  return ''
}

export async function paymentFor(orderId) {
  const store = await readyStore()
  return store.payments.find((payment) => payment.orderId === orderId) || null
}

export function createPaymentRecord(store, order) {
  const payment = {
    id: crypto.randomUUID(),
    orderId: order.id,
    method: order.paymentMethod,
    amount: orderTotal(order),
    status: 'pending',
    provider: order.paymentMethod === 'paymongo'
      ? 'paymongo'
      : order.paymentMethod === 'xendit'
        ? 'xendit'
        : 'cash',
    providerReference: '',
    createdAt: new Date().toISOString(),
  }
  store.payments.unshift(payment)
  return payment
}

export async function startPaymongoCheckout(orders, origin) {
  const header = paymongoHeader()
  if (!header) return { error: 'Electronic payments are not configured.' }
  const amount = orders.reduce((sum, order) => sum + orderTotal(order), 0)
  const response = await fetch('https://api.paymongo.com/v2/checkout_sessions', {
    method: 'POST',
    headers: { Authorization: header, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: {
        attributes: {
          billing: { name: orders[0].buyerName, email: orders[0].buyerEmail },
          line_items: orders.map((order) => ({
            currency: 'PHP',
            amount: Math.round(orderTotal(order) * 100),
            name: order.reference,
            quantity: 1,
          })),
          payment_method_types: ['gcash', 'paymaya', 'card', 'grab_pay'],
          success_url: `${origin}/buyer/orders?payment=return`,
          cancel_url: `${origin}/buyer/orders?payment=cancelled`,
          description: `AgriConnect ${orders.map((order) => order.reference).join(', ')}`,
          reference_number: orders[0].reference.slice(0, 20),
          metadata: { order_ids: orders.map((order) => order.id).join(',') },
        },
      },
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) return { error: 'PayMongo could not start this payment.' }
  return { id: payload.data?.id, url: payload.data?.attributes?.checkout_url }
}

async function paymongoPaid(reference) {
  const header = paymongoHeader()
  if (!header || !reference) return false
  const response = await fetch(`https://api.paymongo.com/v2/checkout_sessions/${reference}`, {
    headers: { Authorization: header },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) return false
  const attributes = payload.data?.attributes || {}
  if (attributes.status === 'paid') return true
  if (Array.isArray(attributes.payments) && attributes.payments.length) return true
  const intent = attributes.payment_intent
  const intentId = typeof intent === 'string' ? intent : intent?.id
  if (!intentId) return false
  const intentResponse = await fetch(`https://api.paymongo.com/v1/payment_intents/${intentId}`, {
    headers: { Authorization: header },
  })
  const intentPayload = await intentResponse.json().catch(() => ({}))
  return intentPayload.data?.attributes?.status === 'succeeded'
}

export async function startXenditCheckout(orders, origin) {
  const header = xenditHeader()
  if (!header) return { error: 'Xendit is not configured.' }
  const externalId = `agriconnect-${orders.map((order) => order.id).join('-')}`.slice(0, 255)
  const amount = orders.reduce((sum, order) => sum + orderTotal(order), 0)
  const response = await fetch('https://api.xendit.co/v2/invoices', {
    method: 'POST',
    headers: { Authorization: header, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      external_id: externalId,
      amount,
      payer_email: orders[0].buyerEmail || undefined,
      description: `AgriConnect ${orders.map((order) => order.reference).join(', ')}`,
      currency: 'PHP',
      success_redirect_url: `${origin}/buyer/orders?payment=return`,
      failure_redirect_url: `${origin}/buyer/orders?payment=cancelled`,
      payment_methods: ['GCASH', 'PAYMAYA', 'GRABPAY', 'CREDIT_CARD'],
      customer: {
        given_names: orders[0].buyerName || 'AgriConnect buyer',
      },
      metadata: { order_ids: orders.map((order) => order.id) },
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    return { error: payload.message || 'Xendit could not start this payment.' }
  }
  return { id: payload.id, url: payload.invoice_url }
}

export async function markXenditInvoicePaid({ invoiceId = '', externalId = '', orderIds = [] } = {}) {
  if (!invoiceId && !externalId && !orderIds.length) return { ok: false }
  const store = await readyStore()
  let changed = false
  const ids = new Set(orderIds.filter(Boolean))
  for (const payment of store.payments) {
    if (payment.provider !== 'xendit') continue
    if (!(payment.providerReference === invoiceId || payment.providerReference === externalId || ids.has(payment.orderId))) continue
    const order = store.orders.get(payment.orderId)
    const paymentChanged = payment.status !== 'paid'
    const orderChanged = Boolean(order && order.paymentStatus !== 'paid')
    if (!paymentChanged && !orderChanged) continue
    if (paymentChanged) payment.status = 'paid'
    if (orderChanged) order.paymentStatus = 'paid'
    changed = true
    await notify(order?.buyer, `Payment received for ${order?.reference || payment.orderId}`, 'Xendit confirmed your electronic payment.', order?.id ? `/buyer/orders/${order.id}` : '/buyer/orders')
  }
  if (changed) await save()
  return { ok: changed }
}

export async function confirmXenditPayments(userId) {
  const header = xenditHeader()
  if (!header) return { ok: false }
  const store = await readyStore()
  let changed = false
  for (const payment of store.payments) {
    const order = store.orders.get(payment.orderId)
    if (!order || order.buyer !== userId || payment.provider !== 'xendit' || payment.status === 'paid' || !payment.providerReference) continue
    const response = await fetch(`https://api.xendit.co/v2/invoices/${payment.providerReference}`, { headers: { Authorization: header } })
    const invoice = await response.json().catch(() => ({}))
    if (!response.ok || invoice.status !== 'PAID') continue
    payment.status = 'paid'
    order.paymentStatus = 'paid'
    changed = true
    await notify(userId, `Payment received for ${order.reference}`, 'Xendit confirmed this payment.', `/buyer/orders/${order.id}`)
  }
  if (changed) await save()
  return { ok: true }
}

export async function markPaymongoCheckoutPaid({ sessionId = '', orderIds = [] } = {}) {
  if (!sessionId && !orderIds.length) return { ok: false }
  const store = await readyStore()
  let changed = false
  const ids = new Set(orderIds.filter(Boolean))
  for (const payment of store.payments) {
    if (payment.provider !== 'paymongo') continue
    if (!(payment.providerReference === sessionId || ids.has(payment.orderId))) continue
    const paymentChanged = payment.status !== 'paid'
    const order = store.orders.get(payment.orderId)
    const orderChanged = Boolean(order && order.paymentStatus !== 'paid')
    if (!paymentChanged && !orderChanged) continue
    if (paymentChanged) payment.status = 'paid'
    if (orderChanged) order.paymentStatus = 'paid'
    changed = true
    await notify(order?.buyer, `Payment received for ${order?.reference || payment.orderId}`, 'PayMongo confirmed your electronic payment.', order?.id ? `/buyer/orders/${order.id}` : '/buyer/orders')
  }
  if (changed) await save()
  return { ok: changed }
}

export async function confirmBuyerPayments(userId) {
  const store = await readyStore()
  let changed = false
  for (const payment of store.payments) {
    const order = store.orders.get(payment.orderId)
    if (!order || order.buyer !== userId || payment.provider !== 'paymongo' || payment.status === 'paid') {
      continue
    }
    if (!(await paymongoPaid(payment.providerReference))) continue
    payment.status = 'paid'
    order.paymentStatus = 'paid'
    changed = true
    await notify(userId, `Payment received for ${order.reference}`, 'PayMongo confirmed this payment.', `/buyer/orders/${order.id}`)
  }
  if (changed) await save()
  return { ok: true }
}

export async function collectCash(orderId, user) {
  const store = await readyStore()
  const order = store.orders.get(orderId)
  if (!order) return { error: 'Order not found.' }
  if (['paymongo', 'xendit'].includes(order.paymentMethod)) return { error: 'This order is paid electronically.' }
  const delivery = store.deliveries.find((item) => item.orderId === orderId)
  const ownsItems = order.items.every((item) => itemSellerId(item) === user.sellerId)
  const allowed =
    user.role === 'admin' ||
    (user.role === 'seller' && ownsItems && order.fulfillment === 'pickup') ||
    (user.role === 'delivery' && delivery?.courierId === user.id && order.fulfillment === 'delivery')
  if (!allowed) return { error: 'You cannot collect this payment.' }
  if (!['picked-up', 'delivered', 'completed'].includes(order.status)) {
    return { error: 'Collect payment after the order is fulfilled.' }
  }
  order.paymentStatus = 'paid'
  const payment = store.payments.find((item) => item.orderId === orderId)
  if (payment) payment.status = 'paid'
  await notify(order.buyer, `Payment recorded for ${order.reference}`, `${user.name} recorded the cash payment.`, `/buyer/orders/${order.id}`)
  await save()
  return { ok: true }
}

export async function listPayments() {
  const store = await readyStore()
  return store.payments
    .map((payment) => ({ ...payment, order: store.orders.get(payment.orderId) || null }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}
