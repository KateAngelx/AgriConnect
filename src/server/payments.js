import { notify } from './notifications'
import { save } from './sync'
import { readyStore } from './store'

export { verifyPaymongoWebhook } from './paymongo-signature.js'

export const DELIVERY_FEE = 49
export const PLATFORM_FEE_PER_KILO = 3

const KILO_UNITS = new Set(['kg', 'kilo', 'kilos', 'kilogram', 'kilograms'])

/** What a ₱3-per-kilo platform share would be. Checkout does not add this yet. */
export function kiloPlatformFee(orders) {
  let kilos = 0
  for (const order of orders || []) {
    for (const item of order.items || []) {
      const unit = String(item.unit || '').toLowerCase()
      if (KILO_UNITS.has(unit)) kilos += Number(item.quantity) || 0
    }
  }
  return kilos * PLATFORM_FEE_PER_KILO
}

/* ── Per‑item platform commission ─────────────────────────────────────── */

export const COMMISSION_PER_ITEM = 1          // default: ₱1 per item
export const COMMISSION_MAX = 50              // maximum allowed rate

/** Validate that a rate is between 0 and COMMISSION_MAX. */
export function normalizeCommissionRate(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return 0
  if (n < 0) return 0
  if (n > COMMISSION_MAX) return COMMISSION_MAX
  return n
}

/** Read the current commission rate from admin settings stored in the store. */
export function commissionRateFrom(store) {
  // Try to read from store settings; fall back to default
  const settings = store.settings || {}
  if (settings.commissionRate !== undefined) {
    return normalizeCommissionRate(settings.commissionRate)
  }
  return COMMISSION_PER_ITEM
}

/** Async version – reads the rate from the store via readyStore(). */
export async function commissionRate() {
  const store = await readyStore()
  return commissionRateFrom(store)
}

/** Compute commission for a list of items at the given rate. */
export function commissionForItems(items, rate) {
  const r = normalizeCommissionRate(rate)
  let totalQty = 0
  for (const item of items || []) {
    // Count each line's quantity; if unit is a kilo unit we still count qty as items
    totalQty += Number(item.quantity) || 0
  }
  return totalQty * r
}

/** Get commission for a specific seller's items in an order. */
export function commissionForSeller(order, sellerId, rate) {
  const r = normalizeCommissionRate(rate)
  const items = (order.items || []).filter((it) => {
    const sid = itemSellerId(it)
    return sid === sellerId
  })
  return commissionForItems(items, r)
}

/** Return the stored platform commission for this order (0 if not yet set). */
export function orderPlatformFee(order) {
  return Number(order.platformFee || 0)
}

/** Return commission computed from item quantities (no stored value needed). */
export function orderReportPlatformFee(order) {
  // Use default rate; callers that have a store should use commissionRateFrom(store)
  const rate = COMMISSION_PER_ITEM
  return commissionForItems(order.items || [], rate)
}

/** Determine who currently holds the commission cash: courier, seller, or platform. */
export function platformFeeHolder(order) {
  // Cash‑COD: collector (courier) holds it until admin remits
  // Online: platform holds it until settlePlatformFeeOnline runs
  if (order.paymentMethod === 'cash') return 'collector'
  if (['paymongo', 'xendit'].includes(order.paymentMethod)) return 'platform'
  return 'none'
}

/** Auto‑settle online platform commission for a single order. */
export async function settlePlatformFeeOnline(orderId) {
  const store = await readyStore()
  const order = store.orders.get(orderId)
  if (!order) return { error: 'Order not found.' }

  const rate = await commissionRate()
  const commission = commissionForItems(order.items || [], rate)

  // For online payments the platform simply "holds" the commission;
  // we record it on the order and notify the admin.
  order.platformFee = commission
  order.platformFeeStatus = 'held-online'
  await notify(
    order.buyer,
    `Platform commission of ₱${commission} recorded for ${order.reference}.`,
    `The ₱${commission} platform commission will be remitted to the admin.`,
    `/admin/payments`
  )
  await save()
  return { ok: true, commission }
}

/** Apply the platform commission rules and attach to the order. */
export function computePlatformCommission(order, commissionRate) {
  const rate = normalizeCommissionRate(commissionRate ?? COMMISSION_PER_ITEM)
  const fulfillment = order.fulfillment || 'pickup'
  const paymentMethod = order.paymentMethod || 'cash'

  // Rule 1: Cash + pickup → ₱0 (no commission)
  if (['cash', 'cash-on-pickup'].includes(paymentMethod) && fulfillment === 'pickup') {
    order.platformFee = 0
    order.platformFeeStatus = 'none'
    return 0
  }

  // Rule 2: Cash + deliver → ₱1 × itemCount
  if (['cash', 'cash-on-delivery'].includes(paymentMethod) && fulfillment === 'delivery') {
    const commission = commissionForItems(order.items || [], rate)
    order.platformFee = commission
    order.platformFeeStatus = 'held-collector'
    return commission
  }

  // Rule 3: Deliver + online → ₱1 × itemCount (auto‑settled)
  if (fulfillment === 'delivery' && ['paymongo', 'xendit'].includes(paymentMethod)) {
    const commission = commissionForItems(order.items || [], rate)
    order.platformFee = commission
    order.platformFeeStatus = 'held-online'
    return commission
  }

  // Default: no commission
  order.platformFee = 0
  order.platformFeeStatus = 'none'
  return 0
}

/** Alias for backward compatibility → reads from admin settings. */
export function platformFeeRate(store) {
  return commissionRateFrom(store)
}

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

let xenditAvailabilityProbe = null

export async function electronicPaymentConfiguredSafely() {
  if (!process.env.PAYMONGO_SECRET_KEY && !process.env.XENDIT_SECRET_KEY) return false
  if (process.env.PAYMONGO_SECRET_KEY) return true
  if (!xenditAvailabilityProbe) {
    xenditAvailabilityProbe = fetch('https://api.xendit.co/v2/invoices?limit=1', {
      headers: { Authorization: xenditHeader(), Accept: 'application/json' },
      cache: 'no-store',
    }).then((response) => response.ok).catch(() => false)
  }
  return xenditAvailabilityProbe
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
    const providerMessage = `${payload.message || ''} ${payload.error_code || ''}`.toLowerCase()
    if (response.status === 403 || providerMessage.includes('forbidden') || providerMessage.includes('permission')) {
      return { error: 'Xendit rejected this API key. Please check that it has the required payment permissions and try Cash checkout for now.' }
    }
    if (response.status === 401) {
      return { error: 'Xendit rejected these credentials. Please verify the secret key or try Cash checkout for now.' }
    }
    return { error: 'Xendit could not start this payment right now. Please try Cash checkout or try again shortly.' }
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
